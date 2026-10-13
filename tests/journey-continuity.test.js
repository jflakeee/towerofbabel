import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile} from '../src/engine.js';
import {advanceStage,continuousRunBackup,prepareRun} from '../src/transactions.js';
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
