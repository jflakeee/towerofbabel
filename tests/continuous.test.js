import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile} from '../src/engine.js';
import {advanceStage,continuousRunBackup} from '../src/transactions.js';
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
 for(const depth of [1,19,20]){p.journey.chaosMaxDepth=20;p.journey.chaosDepth=depth;const next=new Game(p,{seed:1});next.state='won';p.run=next.snapshot();const r=advanceStage(p,next,()=>{});assert.equal(r.ok,true);assert.equal(r.game.mode,'chaos');assert.equal(r.game.depth,Math.min(20,depth+1));assert.ok(Game.restore(p,p.run));}
});
test('unfinished stages cannot trigger rewards or progression',()=>{
 const p=defaultProfile(),g=new Game(p),before=structuredClone(p);assert.equal(advanceStage(p,g,()=>{}).ok,false);assert.deepEqual(p,before);
});

test('continuous stages keep skills, experience, health and cooldowns through save and resume',()=>{
 for(const hero of ['knight','mage','ranger']){
  const p=defaultProfile();p.selectedHero=hero;p.unlocked=5;
  let g=new Game(p,{seed:7});g.skills={power:3,vitality:2,haste:2,fire:2};g.player.maxHp+=50;g.player.hp=57;
  g.level=9;g.xp=13;g.nextXp=60;g.novaCd=7;g.dashCd=2;g.attackClock=.3;g.skillClocks.fire=1.7;g.rerolls=0;
  for(let n=0;n<3;n++){
   g.state='won';p.run=g.snapshot();const previous=g;
   const r=advanceStage(p,g,()=>{});assert.equal(r.ok,true);g=r.game;
   assert.deepEqual(g.skills,previous.skills);assert.equal(g.level,9);assert.equal(g.xp,13);assert.equal(g.nextXp,60);
   assert.equal(g.player.hp,57);assert.equal(g.player.maxHp,previous.player.maxHp);assert.equal(g.novaCd,7);assert.equal(g.dashCd,2);assert.equal(g.attackClock,.3);assert.equal(g.skillClocks.fire,1.7);assert.equal(g.rerolls,0);
   const restored=Game.restore(p,p.run);assert.ok(restored);assert.deepEqual(restored.skills,g.skills);assert.equal(restored.player.hp,57);assert.equal(restored.level,9);
   assert.notEqual(g.runId,previous.runId);assert.equal(g.time,0);assert.deepEqual(g.loot,[]);assert.deepEqual(g.materialLoot,[]);
  }
 }
});
test('new equipment keeps enhancements and sockets while retained vitality applies only once',()=>{
 const p=defaultProfile();p.inventory=[{id:'old',name:'old',slot:'armor',value:10,rarity:2,options:[],sockets:[],enhancement:0}];p.equipped.armor='old';
 let g=new Game(p,{seed:1});g.skills.vitality=2;g.player.maxHp+=50;g.player.hp=80;
 g.loot=[{id:'new-armor',name:'new',slot:'armor',value:100,rarity:3,options:[{key:'hp',value:20}],sockets:[{kind:'emerald',tier:2}],enhancement:2,enhanceSpent:80}];g.state='won';p.run=g.snapshot();
 const before=g.player.maxHp,r=advanceStage(p,g,()=>{});assert.equal(r.ok,true);g=r.game;
 assert.equal(g.appearance.armor.enhancement,2);assert.deepEqual(g.appearance.armor.sockets[0],{kind:'emerald',tier:2});assert.equal(g.player.maxHp,before-10+164);assert.equal(g.player.hp,80);assert.equal(g.skills.vitality,2);
 const hp=g.player.maxHp;g.state='won';p.run=g.snapshot();const next=advanceStage(p,g,()=>{});assert.equal(next.game.player.maxHp,hp);assert.equal(p.inventory.filter(i=>i.id==='new-armor').length,1);
});


test('victory recovery backup keeps next stage and build without mutating the live run',()=>{
 const p=defaultProfile(),g=winner(p);g.skills={vitality:2,fire:3};g.player.maxHp+=50;g.player.hp=61;g.level=8;g.xp=11;g.nextXp=55;g.novaCd=6;g.performance={frames:120,interruptions:1};
 const before=JSON.stringify(p),runBefore=JSON.stringify(g.snapshot());
 assert.equal(advanceStage(p,g,()=>{throw Error('quota');}).ok,false);
 const backup=continuousRunBackup(p,g);assert.equal(backup.ok,true);assert.equal(JSON.stringify(p),before);assert.equal(JSON.stringify(g.snapshot()),runBefore);
 const restored=Game.restore(backup.profile,backup.profile.run);assert.ok(restored);assert.equal(restored.floor,2);assert.deepEqual(restored.skills,g.skills);assert.equal(restored.level,8);assert.equal(restored.xp,11);assert.equal(restored.player.hp,61);assert.equal(restored.novaCd,6);assert.equal(restored.appearance.weapon.id,'reward');
 assert.equal(backup.profile.history.length,1);assert.deepEqual(backup.profile.history[0].performance,g.performance);const gold=backup.profile.gold,id=restored.runId;
 const replay=advanceStage(backup.profile,g,()=>{});assert.equal(replay.game.runId,id);assert.equal(backup.profile.gold,gold);assert.equal(backup.profile.history.length,1);
});
test('recovery of a final tower victory continues into chaos, while defeat stays settled',()=>{
 for(const state of ['won','lost']){
  const p=defaultProfile(),g=winner(p,5);g.state=state;g.skills.fire=2;
  const backup=continuousRunBackup(p,g);assert.equal(backup.ok,true);assert.equal(g.rewarded,false);
  if(state==='won'){const restored=Game.restore(backup.profile,backup.profile.run);assert.equal(restored.mode,'chaos');assert.equal(restored.depth,1);assert.equal(restored.skills.fire,2);}
  else assert.equal(backup.profile.run,null);
 }
 const p=defaultProfile(),g=new Game(p);assert.equal(continuousRunBackup(p,g).ok,false);
});


test('base regeneration ticks at three seconds and survives stage changes and reloads',()=>{
 const p=defaultProfile();let g=new Game(p,{seed:1});g.spawnClock=g.attackClock=100;g.player.hp=50;
 for(let i=0;i<59;i++)g.update(.05);assert.equal(g.player.hp,50);
 const restored=Game.restore(p,g.snapshot());restored.update(.05);assert.ok(Math.abs(restored.player.hp-51.4)<1e-8);
 g.state='won';p.run=g.snapshot();g=advanceStage(p,g,()=>{}).game;g.spawnClock=g.attackClock=100;g.update(.05);assert.ok(Math.abs(g.player.hp-51.4)<1e-8);
 g.player.hp=g.player.maxHp-.1;g.regenClock=2.99;g.update(.02);assert.equal(g.player.hp,g.player.maxHp);
 g.state='lost';g.regenClock=2.99;g.player.hp=0;g.update(.05);assert.equal(g.player.hp,0);
});
test('legacy saves start regeneration at zero and invalid timers cannot resume',()=>{
 const p=defaultProfile(),g=new Game(p,{seed:1}),snapshot=g.snapshot();delete snapshot.regenClock;assert.equal(Game.restore(p,snapshot).regenClock,0);
 for(const value of [-1,3,Infinity,null]){snapshot.regenClock=value;assert.equal(Game.restore(p,snapshot),null);}
});
