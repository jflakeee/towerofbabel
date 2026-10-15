import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile} from '../src/engine.js';
import {prepareRun,advanceStage} from '../src/transactions.js';
import {ORIGIN,gateLocation,residentMap,setWorldView,releaseOutsideView,areaScale,explorationGuides,nextGateLocation} from '../src/exploration.js';
import {isWalkable,moveEntity} from '../src/world.js';
const make=()=>{const p=defaultProfile(),g=new Game(p,{seed:41,exploration:true});g.spawnClock=g.attackClock=999;return {p,g};};
test('new and legacy resumed journeys use exploration without spending twice or resetting growth',()=>{
 const p=defaultProfile(),start=prepareRun(p,{},()=>{});assert.equal(start.game.worldVersion,2);assert.equal(p.run.exploration.gate,1);
 const legacy=new Game(p,{seed:3});legacy.player.x=1000;legacy.skills.power=2;legacy.level=4;p.run=legacy.snapshot();
 const result=prepareRun(p,{resume:true},()=>{});assert.equal(result.game.worldVersion,2);assert.equal(result.game.player.x,1000);assert.equal(result.game.skills.power,2);assert.equal(result.game.level,4);
});
test('guardian arrival preserves living enemies and hostile shots, with no exploration deadline',()=>{
 const {g}=make();Object.assign(g.player,gateLocation(1));g.player.x-=100;
 const enemy=g.spawn('grunt');Object.assign(enemy,{x:g.player.x+80,y:g.player.y,hp:100,speed:0});g.enemyShots=[{x:g.player.x+150,y:g.player.y,vx:0,vy:0,r:5,damage:1,life:100}];
 g.time=151;g.update(.01);assert.equal(g.state,'playing');assert.ok(g.enemies.includes(enemy));assert.equal(g.enemyShots.length,1);assert.equal(g.livingBosses().length,1);
 g.update(.01);assert.equal(g.livingBosses().length,1);assert.equal(g.timeLimit(),Infinity);
});
test('victory keeps world position and live enemies, settles once, and records previous and next guides',()=>{
 const {p,g}=make();Object.assign(g.player,gateLocation(1));g.player.x-=100;const enemy=g.spawn('grunt');Object.assign(enemy,{x:g.player.x-70,y:g.player.y,speed:0});const boss=g.spawn('boss');const where={x:boss.x,y:boss.y};
 g.skills={power:2};g.level=5;g.player.hp=70;g.damageEnemy(boss,1e6);assert.equal(g.state,'won');p.run=g.snapshot();const before=structuredClone(p);
 assert.equal(advanceStage(p,g,()=>{throw Error('quota');}).ok,false);assert.deepEqual(p,before);
 const result=advanceStage(p,g,()=>{});assert.ok(result.ok);const next=result.game;
 assert.equal(next.player.x,g.player.x);assert.equal(next.player.y,g.player.y);assert.equal(next.player.hp,70);assert.deepEqual(next.skills,g.skills);assert.equal(next.enemies.find(e=>e.id===enemy.id).hp,enemy.hp);
 assert.equal(next.exploration.gate,2);assert.deepEqual(next.exploration.previous,where);assert.equal(explorationGuides(next).length,3);
 const restored=Game.restore(p,p.run);assert.deepEqual(restored.exploration,next.exploration);assert.equal(restored.player.x,next.player.x);
 const gold=p.gold;assert.ok(advanceStage(p,g,()=>{}).replayed);assert.equal(p.gold,gold);assert.equal(p.history.length,1);
});
test('visible map residency stays bounded and revisiting regenerates the same terrain without history',()=>{
 const {g}=make();setWorldView(g,250,400);const original=structuredClone(residentMap(g).obstacles),startKeys=[...residentMap(g).chunks.keys()];
 for(let i=1;i<=300;i++){g.player.x=800+i*1000;g.player.y=800-i*700;const map=residentMap(g);assert.ok(map.chunks.size<=12);assert.ok(map.obstacles.length<=12);}
 assert.ok(startKeys.every(key=>!residentMap(g).chunks.has(key)));Object.assign(g.player,ORIGIN);assert.deepEqual(residentMap(g).obstacles,original);
 const snapshot=g.snapshot();assert.equal('chunks'in snapshot,false);assert.equal('map'in snapshot,false);assert.ok(JSON.stringify(snapshot).length<10000);
 assert.ok(isWalkable(g,ORIGIN.x,ORIGIN.y,35));assert.ok(isWalkable(g,gateLocation(1).x,gateLocation(1).y,35));
 Object.assign(g.player,{x:-1000,y:-1000});moveEntity(g,g.player,-5,0);assert.equal(g.player.x,-1005);
});
test('offscreen combat is discarded and enemy difficulty depends on location, not elapsed time',()=>{
 const {g}=make();setWorldView(g,300,600);g.spawnClock=0;g.update(.01);assert.ok(g.enemies.length);
 Object.assign(g.player,{x:30000,y:30000});releaseOutsideView(g);assert.equal(g.enemies.length,0);assert.equal(g.enemyShots.length,0);
 const sample=(x,time)=>{const a=new Game(defaultProfile(),{seed:19,exploration:true});a.player.x=x;a.time=time;return a.spawn('grunt');};
 const near=sample(800,0),far=sample(9800,0),revisit=sample(9800,2000);assert.ok(far.hp>near.hp);assert.ok(far.damage>near.damage);assert.equal(far.hp,revisit.hp);assert.equal(far.damage,revisit.damage);assert.ok(areaScale({x:-9000,y:800})>areaScale(ORIGIN));
});
test('leaving a guardian unloads it, revisiting respawns it, but defeated guardians never pay twice',()=>{
 const {p,g}=make();Object.assign(g.player,gateLocation(1));g.update(.01);const boss=g.currentBoss();assert.ok(boss);boss.hp=1;
 Object.assign(g.player,ORIGIN);releaseOutsideView(g);assert.equal(g.currentBoss(),null);
 Object.assign(g.player,gateLocation(1));g.update(.01);assert.equal(g.currentBoss().hp,g.currentBoss().maxHp);
 g.damageEnemy(g.currentBoss(),1e9);const next=advanceStage(p,g,()=>{}).game;Object.assign(next.player,gateLocation(1));next.update(.01);assert.equal(next.currentBoss(),null);assert.equal(next.exploration.gate,2);
});
test('invalid exploration coordinates and progress cannot resume',()=>{
 const {p,g}=make(),snapshot=g.snapshot();for(const mutate of [s=>s.exploration.gate=0,s=>s.exploration.previous={x:NaN,y:0},s=>s.player.x=1e20,s=>s.exploration=null]){const value=structuredClone(snapshot);mutate(value);assert.equal(Game.restore(p,value),null);}
});

// Floor/theme rotation must never reset the radial difficulty of guardians.
test('farther guardians keep increasing health and damage across floor and chaos rotations',()=>{
 for(const difficulty of ['normal','hard','nightmare']){
  let lastHp=0,lastDamage=0;
  for(let gate=1;gate<=25;gate++){
   const p=defaultProfile();p.journey.difficulty=difficulty;p.journey.unlockedDifficulty=2;
   const g=new Game(p,{seed:9,exploration:true,floor:(gate-1)%5+1});g.exploration.gate=gate;
   Object.assign(g.player,gateLocation(gate));const boss=g.spawn('boss');
   assert.ok(boss.maxHp>lastHp,`${difficulty} gate ${gate} health must increase`);
   assert.ok(boss.damage>lastDamage,`${difficulty} gate ${gate} damage must increase`);
   lastHp=boss.maxHp;lastDamage=boss.damage;
   const restored=Game.restore(p,g.snapshot());assert.ok(restored);assert.equal(restored.currentBoss().maxHp,lastHp);
  }
 }
});
test('guardian regeneration at the same coordinate has the same stats regardless of stage theme',()=>{
 const samples=[];
 for(const floor of [1,3,5]){
  const g=new Game(defaultProfile(),{seed:5,exploration:true,floor});g.exploration.gate=7;
  Object.assign(g.player,gateLocation(7));g.time=floor*100;const boss=g.spawn('boss');samples.push([boss.maxHp,boss.damage]);
 }
 assert.deepEqual(samples[0],samples[1]);assert.deepEqual(samples[1],samples[2]);
});

test('wide view never activates the next guardian while stationary at the cleared location',()=>{
 const {p,g}=make();setWorldView(g,1600,1600);Object.assign(g.player,gateLocation(1));
 const boss=g.spawn('boss');g.damageEnemy(boss,1e9);const next=advanceStage(p,g,()=>{}).game;
 setWorldView(next,1600,1600);next.spawnClock=next.attackClock=999;
 for(let i=0;i<120;i++)next.update(.05);
 assert.equal(next.currentBoss(),null);assert.ok(next.exploration.departure);
 const restored=Game.restore(p,next.snapshot());assert.deepEqual(restored.exploration.departure,next.exploration.departure);
 Object.assign(restored.player,nextGateLocation(restored));restored.update(.01);assert.equal(restored.livingBosses().length,1);assert.equal(restored.exploration.departure,null);
 restored.update(.01);assert.equal(restored.livingBosses().length,1);
});
test('a guardian chased to the next waypoint cannot cause an instant replacement on clear or reload',()=>{
 const {p,g}=make(),point=gateLocation(2);Object.assign(g.player,point);
 const boss=g.spawn('boss');Object.assign(boss,point);g.damageEnemy(boss,1e9);
 const next=advanceStage(p,g,()=>{}).game;next.spawnClock=next.attackClock=999;
 const resumed=Game.restore(p,next.snapshot());resumed.update(.01);assert.equal(resumed.currentBoss(),null);
 resumed.player.x=point.x+300;resumed.update(.01);assert.equal(resumed.currentBoss(),null);assert.equal(resumed.exploration.departure,null);
 Object.assign(resumed.player,nextGateLocation(resumed));resumed.update(.01);assert.equal(resumed.livingBosses().length,1);
});
test('initial guardian waits for proximity even when its waypoint is visible on a large display',()=>{
 const {g}=make();setWorldView(g,1600,1600);g.update(.01);assert.equal(g.currentBoss(),null);
 Object.assign(g.player,gateLocation(1));g.player.x-=159;g.update(.01);assert.equal(g.livingBosses().length,1);
});

test('next guardian is at least 1000 from the real kill and player positions even after long chases',()=>{
 for(const position of [{x:800,y:800},{x:20000,y:-12000},{x:-7000,y:-31000}]){
  const {p,g}=make();Object.assign(g.player,position);const boss=g.spawn('boss');Object.assign(boss,{x:position.x+200,y:position.y-150});g.damageEnemy(boss,1e9);
  const cleared={x:boss.x,y:boss.y},before=structuredClone(p);
  assert.equal(advanceStage(p,g,()=>{throw Error('quota');}).ok,false);assert.deepEqual(p,before);
  const next=advanceStage(p,g,()=>{}).game,target=nextGateLocation(next);
  assert.ok(Math.hypot(target.x-position.x,target.y-position.y)>=1000);
  assert.ok(Math.hypot(target.x-cleared.x,target.y-cleared.y)>=1000);
  assert.ok(isWalkable(next,target.x,target.y,35));
  assert.deepEqual(explorationGuides(next).find(m=>m.id==='next-gate-direction').point,target);
  const restored=Game.restore(p,next.snapshot());assert.deepEqual(nextGateLocation(restored),target);
  assert.deepEqual(nextGateLocation(advanceStage(p,g,()=>{}).game),target);
  Object.assign(restored.player,target);restored.update(.01);assert.deepEqual({x:restored.currentBoss().x,y:restored.currentBoss().y},target);
 }
});

test('older saves awaiting the next guardian gain a persistent 1000-distance waypoint on resume',()=>{
 const {p,g}=make();Object.assign(g.player,gateLocation(1));const boss=g.spawn('boss');g.damageEnemy(boss,1e9);
 const next=advanceStage(p,g,()=>{}).game,snapshot=next.snapshot();delete snapshot.exploration.next;delete snapshot.exploration.departure;
 const restored=Game.restore(p,snapshot),target=nextGateLocation(restored);
 assert.ok(Math.hypot(target.x-restored.player.x,target.y-restored.player.y)>=1000);
 assert.ok(Math.hypot(target.x-restored.exploration.previous.x,target.y-restored.exploration.previous.y)>=1000);
 assert.ok(restored.exploration.departure);assert.deepEqual(nextGateLocation(Game.restore(p,restored.snapshot())),target);
});
