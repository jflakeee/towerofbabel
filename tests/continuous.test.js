import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile} from '../src/engine.js';
import {advanceStage} from '../src/transactions.js';
const winner=(p,floor=1)=>{p.unlocked=5;const g=new Game(p,{floor,seed:1});g.state='won';g.gold=30;g.loot=[{id:'reward',name:'보상',slot:'weapon',value:999,rarity:2,floor}];p.run=g.snapshot();return g;};
test('stage transition settles, equips and saves the next stage once without spending upgrade budget',()=>{
 const p=defaultProfile();p.gold=500;p.automation.upgradeBudget=100;const g=winner(p);let writes=0;
 const r=advanceStage(p,g,d=>{writes++;assert.equal(d.run.floor,2);assert.equal(d.equipped.weapon,'reward');});
 assert.equal(r.ok,true);assert.equal(writes,1);assert.equal(p.gold,590);assert.equal(r.game.appearance.weapon.id,'reward');assert.equal(p.history.length,1);assert.equal(p.history[0].loot[0].id,'reward');assert.equal(p.upgrades.power,0);
 const id=r.game.runId;const replay=advanceStage(p,g,()=>{});assert.equal(replay.game.runId,id);assert.equal(p.history.length,1);assert.equal(p.gold,590);
});
test('failed stage save rolls back rewards, equipment and next run, and can retry',()=>{
 const p=defaultProfile(),g=winner(p),before=structuredClone(p);
 assert.equal(advanceStage(p,g,()=>{throw Error('quota');}).ok,false);assert.deepEqual(p,before);assert.equal(g.rewarded,false);
 const r=advanceStage(p,g,()=>{});assert.equal(r.ok,true);assert.equal(p.history.length,1);assert.equal(p.run.floor,2);
});
test('tower completion enters chaos and chaos advances to a repeatable stage 20',()=>{
 const p=defaultProfile(),g=winner(p,5);assert.equal(advanceStage(p,g,()=>{}).game.depth,1);assert.equal(p.journey.mode,'chaos');
 for(const depth of [1,19,20]){p.journey.chaosDepth=depth;const next=new Game(p,{seed:1});next.state='won';p.run=next.snapshot();const r=advanceStage(p,next,()=>{});assert.equal(r.ok,true);assert.equal(r.game.mode,'chaos');assert.equal(r.game.depth,Math.min(20,depth+1));assert.ok(Game.restore(p,p.run));}
});
test('unfinished stages cannot trigger rewards or progression',()=>{
 const p=defaultProfile(),g=new Game(p),before=structuredClone(p);assert.equal(advanceStage(p,g,()=>{}).ok,false);assert.deepEqual(p,before);
});
