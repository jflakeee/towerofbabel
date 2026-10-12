import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile,seededRandom,SKILLS} from '../src/engine.js';
import {rankChoices,resolveChoices,automateAbilities,combineDirections} from '../src/automation.js';
const make=()=>new Game(defaultProfile(),{rng:seededRandom(1)});
test('touch directions normalize diagonals and release independently',()=>{
 const pointers=new Map([[1,{x:1,y:0}],[2,{x:0,y:-1}]]);assert.ok(Math.abs(Math.hypot(...Object.values(combineDirections(pointers.values())))-1)<1e-10);pointers.delete(1);assert.deepEqual(combineDirections(pointers.values()),{x:0,y:-1});pointers.clear();assert.deepEqual(combineDirections(pointers.values()),{x:0,y:0});assert.deepEqual(combineDirections([{x:1,y:0},{x:-1,y:0}]),{x:0,y:0});
});
test('automatic choices honor low health, strategy and skill limits',()=>{
 const g=make();g.choices=['power','vitality','magnet'];g.player.hp=10;assert.equal(rankChoices(g)[0].id,'vitality');g.player.hp=g.player.maxHp;g.autoStrategy='farming';assert.equal(rankChoices(g)[0].id,'magnet');g.skills.magnet=4;assert.ok(!rankChoices(g).some(s=>s.id==='magnet'));
});
test('multiple pending levels resolve without manual choices and survive reload',()=>{
 const g=make();g.gainXp(80);const selected=resolveChoices(g);assert.ok(selected.length>1);assert.equal(g.state,'playing');assert.equal(g.pendingLevels,0);for(const s of SKILLS)assert.ok((g.skills[s.id]||0)<=s.max);const restored=Game.restore(defaultProfile(),g.snapshot());assert.deepEqual(restored.decisionLog,g.decisionLog);assert.equal(restored.autoStrategy,g.autoStrategy);
});
test('automatic abilities keep cooldowns untouched in an empty arena',()=>{
 const g=make();automateAbilities(g,{x:1,y:0});assert.equal(g.dashCd,0);assert.equal(g.novaCd,0);
});
test('automatic blast can win a boss fight and never spends twice',()=>{
 const g=make(),boss=g.spawn('boss');boss.x=g.player.x+100;boss.y=g.player.y;boss.hp=20;automateAbilities(g,{x:0,y:0});assert.equal(g.state,'won');assert.equal(g.novaCd,12);automateAbilities(g,{x:0,y:0});assert.equal(g.novaCd,12);
});
test('automatic dodge escapes an imminent telegraph and obeys cooldown',()=>{
 const g=make(),boss=g.spawn('boss');boss.x=g.player.x+200;boss.telegraph=.1;boss.targetX=g.player.x;boss.targetY=g.player.y;g.novaCd=5;automateAbilities(g,{x:1,y:0});assert.equal(g.dashCd,3);assert.equal(g.dashDir.x,1);automateAbilities(g,{x:0,y:-1});assert.equal(g.dashDir.x,1);
});
test('every hero can finish a simulated run using movement and automation only',()=>{
 for(const hero of ['knight','mage','ranger']){const p=defaultProfile();p.selectedHero=hero;const g=new Game(p,{rng:seededRandom(1)});for(let i=0;i<3100&&['playing','choosing'].includes(g.state);i++){resolveChoices(g);const boss=g.enemies.find(e=>e.type==='boss');let input={x:Math.cos(i*.06),y:Math.sin(i*.06)};if(boss){const dx=boss.x-g.player.x,dy=boss.y-g.player.y,d=Math.hypot(dx,dy)||1,range=hero==='knight'?65:170;input=d>range+10?{x:dx/d,y:dy/d}:d<range-10?{x:-dx/d,y:-dy/d}:{x:-dy/d,y:dx/d};}automateAbilities(g,input);g.update(.05,input);}assert.ok(['won','lost'].includes(g.state));assert.ok(g.decisionLog.length>0);assert.equal(g.pendingLevels,0);}
});
test('tied choices use user priority before stable content ID',()=>{
 const g=make();g.choices=['fire','power'];g.automation.priority={power:1,fire:0};
 const rank=rankChoices(g);assert.equal(rank[0].score,rank[1].score);assert.equal(rank[0].id,'power');
 g.choices.reverse();assert.equal(rankChoices(g)[0].id,'power');
});
