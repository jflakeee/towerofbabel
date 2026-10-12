import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile} from '../src/engine.js';
import {segmentCircleTime,firstWallTime} from '../src/world.js';
const game=()=>{const g=new Game(defaultProfile(),{seed:1});g.spawnClock=g.attackClock=100;g.player.crit=0;return g;};
const enemy=(g,x,y=800)=>{const e=g.spawn('grunt');Object.assign(e,{x,y,hp:1000,maxHp:1000,speed:0,damage:0});return e;};
const shot=(extra={})=>({x:600,y:800,vx:4000,vy:0,r:4,damage:10,life:1,hitIds:[],...extra});
test('segment contact handles crossing, tangency, no motion and finite endpoints',()=>{
 assert.equal(segmentCircleTime({x:0,y:0},{x:10,y:0},{x:5,y:0},1),.4);
 assert.equal(segmentCircleTime({x:0,y:1},{x:10,y:1},{x:5,y:0},1),.5);
 assert.equal(segmentCircleTime({x:0,y:0},{x:0,y:0},{x:0,y:0},1),0);
 assert.equal(segmentCircleTime({x:0,y:0},{x:1,y:0},{x:5,y:0},1),Infinity);
});
test('fast projectiles hit crossed enemies in spatial order, independent of array order',()=>{
 const g=game(),far=enemy(g,740),near=enemy(g,680);g.projectiles=[shot()];g.update(.05);
 assert.equal(near.hp,990);assert.equal(far.hp,1000);assert.equal(g.projectiles.length,0);
});
test('piercing crosses multiple enemies in one step and never hits the same enemy twice',()=>{
 const g=game(),a=enemy(g,680),b=enemy(g,720),c=enemy(g,760);g.projectiles=[shot({pierce:1})];g.update(.05);
 assert.equal(a.hp,990);assert.equal(b.hp,990);assert.equal(c.hp,1000);
 const h=game(),e=enemy(h,680);h.projectiles=[shot({vx:1400,pierce:2})];h.update(.05);h.update(.05);assert.equal(e.hp,990);
});
test('collision before a wall hits; targets after the wall stay protected',()=>{
 const g=game(),before=enemy(g,490,400),behind=enemy(g,490,530);
 g.projectiles=[shot({x:490,y:350,vx:0,vy:4000,pierce:3})];assert.ok(firstWallTime(g,{x:490,y:350},{x:490,y:550},4)<1);g.update(.05);
 assert.equal(before.hp,990);assert.equal(behind.hp,1000);assert.equal(g.projectiles.length,0);
});
test('enemy shots crossing the player hit, while expired or insufficient-lifetime shots cannot',()=>{
 const g=game(),hp=g.player.hp;g.enemyShots=[shot({x:700,vx:4000})];g.update(.05);assert.equal(g.player.hp,hp-10);
 const h=game(),e=enemy(h,750);h.projectiles=[shot({life:0}),shot({life:.01})];h.update(.05);assert.equal(e.hp,1000);
});
test('guardian kill freezes later shots, damage and rewards in the same update',()=>{
 const g=game(),boss=g.spawn('boss');Object.assign(boss,{x:680,y:800,hp:1,speed:0,cooldown:100});const e=enemy(g,740);e.hp=1;
 g.projectiles=[shot({pierce:3})];g.enemyShots=[shot({x:700,damage:10000})];const hp=g.player.hp;g.update(.05);
 assert.equal(g.state,'won');assert.equal(g.player.hp,hp);assert.equal(g.kills,1);assert.equal(e.hp,1);const loot=g.loot.length;g.damageEnemy(e,100);assert.equal(g.kills,1);assert.equal(g.loot.length,loot);
});
test('a stale offered skill cannot bypass its maximum or class restriction',()=>{
 const g=game();g.state='choosing';g.choices=['power','meteor'];g.skills.power=5;assert.equal(g.choose('power'),false);assert.equal(g.choose('meteor'),false);
});
