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
