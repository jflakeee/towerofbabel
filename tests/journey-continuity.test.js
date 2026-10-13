import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile} from '../src/engine.js';
import {advanceStage,continuousRunBackup,prepareRun,autoEquip,settleRun} from '../src/transactions.js';
function fixture(mode,depth=1,floor=1){
 const p=defaultProfile();p.unlocked=5;p.journey={...p.journey,chaosUnlocked:true,chaosMaxDepth:20,unlockedDifficulty:2,mode,chaosDepth:depth,difficulty:'hard'};
 const g=new Game(p,{floor,seed:31});g.skills={fire:2};g.state='won';p.run=g.snapshot();
 p.journey.mode=mode==='chaos'?'tower':'chaos';p.journey.difficulty='nightmare';p.journey.chaosDepth=18;p.selectedFloor=5;
 return {p,g};
}
test('resumed tower progression keeps its difficulty and mode despite edited next-run settings',()=>{
 const {p,g}=fixture('tower',1,2),r=advanceStage(p,g,()=>{});assert.equal(r.ok,true);
 assert.equal(r.game.mode,'tower');assert.equal(r.game.floor,3);assert.equal(r.game.difficulty,'hard');assert.deepEqual(r.game.skills,{fire:2});
 assert.equal(p.journey.difficulty,'nightmare');assert.equal(p.journey.mode,'chaos');assert.equal(Game.restore(p,p.run).difficulty,'hard');
 p.run=null;const fresh=prepareRun(p,{},()=>{});assert.equal(fresh.ok,true);assert.equal(fresh.game.difficulty,'nightmare');assert.equal(fresh.game.mode,'chaos');
});
test('chaos progression and tower-to-chaos transition derive from the running journey',()=>{
 for(const [mode,depth,floor,expected] of [['chaos',7,1,8],['chaos',20,1,20],['tower',1,5,1]]){
  const {p,g}=fixture(mode,depth,floor),r=advanceStage(p,g,()=>{});assert.equal(r.ok,true);
  assert.equal(r.game.mode,'chaos');assert.equal(r.game.depth,expected);assert.equal(r.game.floor,(expected-1)%5+1);assert.equal(r.game.difficulty,'hard');
 }
});
test('frozen journey rules survive failed transition, backup, retry and replay',()=>{
 const {p,g}=fixture('chaos',7),before=JSON.stringify(p),live=JSON.stringify(g.snapshot());
 assert.equal(advanceStage(p,g,()=>{throw Error('quota');}).ok,false);assert.equal(JSON.stringify(p),before);assert.equal(JSON.stringify(g.snapshot()),live);
 const backup=continuousRunBackup(p,g);assert.equal(backup.ok,true);assert.equal(backup.profile.run.mode,'chaos');assert.equal(backup.profile.run.depth,8);assert.equal(backup.profile.run.difficulty,'hard');
 const r=advanceStage(p,g,()=>{});assert.equal(r.ok,true);assert.equal(r.game.difficulty,'hard');assert.equal(r.game.depth,8);
 const replay=advanceStage(p,g,()=>{});assert.equal(replay.game.runId,r.game.runId);assert.equal(replay.game.mode,'chaos');assert.equal(p.history.length,1);
});

test('stage auto-equipment uses the saved build while lobby recommendations use the new build',()=>{
 const p=defaultProfile();p.settings.strategy='survival';
 const g=new Game(p,{seed:44});g.state='won';g.loot=[
  {id:'health',name:'health',slot:'weapon',value:1,rarity:2,options:[{key:'hp',value:40}]},
  {id:'damage',name:'damage',slot:'weapon',value:8,rarity:2,options:[]}
 ];p.run=g.snapshot();p.settings.strategy='attack';
 const before=JSON.stringify(p);assert.equal(advanceStage(p,g,()=>{throw Error('quota');}).ok,false);assert.equal(JSON.stringify(p),before);
 const backup=continuousRunBackup(p,g);assert.equal(backup.ok,true);assert.equal(backup.profile.equipped.weapon,'health');
 const result=advanceStage(p,g,()=>{});assert.equal(result.ok,true);assert.equal(p.equipped.weapon,'health');assert.equal(result.game.appearance.weapon.id,'health');assert.equal(p.settings.strategy,'attack');
 autoEquip(p);assert.equal(p.equipped.weapon,'damage');
});
test('defeat settlement respects saved option priorities without overwriting next-run settings',()=>{
 const p=defaultProfile();p.automation.priority.fire=10;
 const g=new Game(p,{seed:45});g.state='lost';g.loot=[
  {id:'fire',name:'fire',slot:'weapon',value:1,rarity:2,options:[{key:'fire',value:20}]},
  {id:'plain',name:'plain',slot:'weapon',value:7,rarity:2,options:[]}
 ];p.automation.priority.fire=0;
 assert.equal(settleRun(p,g,()=>{}).ok,true);assert.equal(p.equipped.weapon,'fire');assert.equal(p.automation.priority.fire,0);
 autoEquip(p);assert.equal(p.equipped.weapon,'plain');
});
