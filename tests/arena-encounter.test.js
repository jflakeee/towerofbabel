import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile,grantRewards} from '../src/engine.js';
import {advanceStage,prepareRun,settleRun,continuousRunBackup} from '../src/transactions.js';
const arena=p=>new Game(p,{seed:47,encounter:'dual-boss'});
function harmless(g){g.player.hp=g.player.maxHp=1e6;g.player.invulnerable=10000;g.attackClock=10000;}

test('dual boss encounter starts with two bosses and retains them while waves spawn',()=>{
 const p=defaultProfile(),g=arena(p);harmless(g);
 const ids=g.livingBosses().map(b=>b.id);assert.equal(ids.length,2);assert.equal(g.timeRemaining(),300);
 for(const time of [0,90,150,299]){g.time=time;g.spawnClock=0;g.update(.05);assert.equal(g.state,'playing');assert.deepEqual(g.livingBosses().map(b=>b.id),ids);}
 assert.equal(g.enemies.filter(e=>e.type!=='boss').length,4);
 g.state='choosing';const before=g.time;g.update(.05);assert.equal(g.time,before);
});
test('five-minute simulation resumes with identical wave timing, entities and random state',()=>{
 const p=defaultProfile();let g=arena(p);harmless(g);
 for(let i=0;i<3000;i++)g.update(.05);
 const restored=Game.restore(p,g.snapshot());assert.ok(restored);assert.equal(restored.encounter,'dual-boss');assert.equal(restored.livingBosses().length,2);
 for(let i=0;i<2998;i++){g.update(.05);restored.update(.05);}
 assert.equal(g.state,'playing');assert.equal(restored.state,'playing');assert.deepEqual(g.enemies,restored.enemies);assert.equal(g.rng.getState(),restored.rng.getState());assert.equal(g.timeRemaining(),restored.timeRemaining());
 g.time=restored.time=299.99;g.update(.02);restored.update(.02);assert.equal(g.state,'lost');assert.equal(restored.state,'lost');assert.equal(g.timeRemaining(),0);
 const ended=g.snapshot();g.update(.05);assert.deepEqual(g.snapshot(),ended);
});
test('one defeated boss stays defeated through reload and cannot respawn at former stage boundaries',()=>{
 const p=defaultProfile(),g=arena(p);harmless(g);g.damageEnemy(g.currentBoss(),1e6,false);assert.equal(g.state,'playing');
 const restored=Game.restore(p,g.snapshot());assert.ok(restored);const id=restored.currentBoss().id;
 for(const time of [90,150,299]){restored.time=time;restored.spawnClock=0;restored.update(.01);assert.equal(restored.livingBosses().length,1);assert.equal(restored.currentBoss().id,id);}
 assert.equal(restored.loot.length,1);restored.damageEnemy(restored.currentBoss(),1e6,false);assert.equal(restored.state,'won');assert.equal(restored.loot.length,2);
});
test('unfinished arena entry and reward rules cannot grant tower progression or currency',()=>{
 for(const state of ['won','lost']){
  const p=defaultProfile(),g=arena(p);g.state=state;g.gold=100;p.run=g.snapshot();const before=JSON.stringify(p);let writes=0;
  assert.equal(grantRewards(p,g),false);assert.equal(settleRun(p,g,()=>writes++).ok,false);assert.equal(advanceStage(p,g,()=>writes++).ok,false);assert.equal(continuousRunBackup(p,g).ok,false);
  assert.equal(prepareRun(p,{resume:true},()=>writes++).ok,false);assert.equal(writes,0);assert.equal(JSON.stringify(p),before);assert.equal(g.rewarded,false);
 }
});
test('legacy stages keep their timeline and invalid encounter saves are rejected',()=>{
 const p=defaultProfile(),g=new Game(p,{seed:1}),legacy=g.snapshot();delete legacy.encounter;
 const restored=Game.restore(p,legacy);assert.ok(restored);assert.equal(restored.encounter,'stage');assert.equal(restored.timeLimit(),150);
 restored.time=90;restored.update(.01);assert.equal(restored.livingBosses().length,1);restored.time=149.99;restored.update(.02);assert.equal(restored.state,'lost');
 const valid=arena(p).snapshot();for(const edit of [{encounter:'unknown'},{duration:90},{bossSpawned:false},{enemies:[]}])assert.equal(Game.restore(p,{...valid,...edit}),null);
 assert.throws(()=>new Game(p,{encounter:'unknown'}));
});

test('arena scales from cleared chaos progress, not selected or unlocked stages',()=>{
 const p=defaultProfile();Object.assign(p.journey,{chaosUnlocked:true,chaosMaxDepth:20,chaosDepth:19,chaosBestCleared:7});
 const before=structuredClone(p),base=arena(p);
 assert.equal(base.arenaBestCleared,7);assert.equal(base.depth,7);assert.equal(base.floor,1);assert.equal(base.mode,'chaos');assert.deepEqual(p,before);
 for(const mode of ['tower','chaos'])for(const floor of [1,5])for(const depth of [1,20]){
  const other=structuredClone(p);other.selectedFloor=floor;Object.assign(other.journey,{mode,chaosDepth:depth});
  const g=arena(other);assert.deepEqual(g.enemies,base.enemies);assert.equal(g.floor,base.floor);assert.equal(g.depth,7);
 }
 // Fixed arena content prevents a lower floor cycle from weakening later milestones.
 let previousHp=0;for(const best of [0,1,5,6,10,11,20]){
  p.journey.chaosBestCleared=best;const g=arena(p);assert.equal(g.depth,Math.max(1,best));assert.ok(g.currentBoss().maxHp>=previousHp);previousHp=g.currentBoss().maxHp;
 }
 const stage=new Game(before,{seed:47});assert.equal(stage.mode,'tower');assert.equal(stage.floor,before.selectedFloor);assert.equal(stage.arenaBestCleared,null);
});

test('arena retains its entry scaling after restore and rejects inconsistent scaling metadata',()=>{
 const p=defaultProfile();Object.assign(p.journey,{chaosUnlocked:true,chaosMaxDepth:20,chaosBestCleared:7});
 const g=arena(p),snapshot=g.snapshot();p.journey.chaosBestCleared=20;
 const restored=Game.restore(p,snapshot);assert.ok(restored);assert.equal(restored.arenaBestCleared,7);assert.equal(restored.depth,7);assert.deepEqual(restored.enemies,g.enemies);
 for(const edit of [{arenaBestCleared:-1},{arenaBestCleared:21},{arenaBestCleared:1.5},{arenaBestCleared:8},{mode:'tower'},{floor:2}])assert.equal(Game.restore(p,{...snapshot,...edit}),null);
 const legacy={...snapshot,mode:'tower',floor:3,depth:1};delete legacy.arenaBestCleared;
 const old=Game.restore(p,legacy);assert.ok(old);assert.equal(old.arenaBestCleared,null);assert.equal(old.floor,3);assert.equal(old.mode,'tower');
});
