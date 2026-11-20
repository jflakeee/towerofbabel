import test from 'node:test';
import assert from 'node:assert/strict';
import {ORIGIN,areaLevel,areaScale,newExploration,gateAfterClear,nextGateLocation,canActivateGate,residentMap,releaseDistantEntities,validExploration} from '../src/exploration.js';

test('distance difficulty is monotone across risk boundaries',()=>{
 for(const [distance,level] of [[0,1],[899,1],[900,2],[1799,2],[1800,3],[9000,11]]){
  const p={x:ORIGIN.x-distance,y:ORIGIN.y};
  assert.equal(areaLevel(p),level);assert.equal(areaScale(p),1+distance/1800);
 }
});
test('successive saved gate coordinates move outward and remain separated',()=>{
 const game={player:{...ORIGIN},exploration:newExploration()};
 for(let i=0;i<100;i++){
  const old=nextGateLocation(game);game.player={...old};game.exploration.previous={...old};
  const next=gateAfterClear(game);
  assert.ok(Math.hypot(next.x-old.x,next.y-old.y)>=1000);
  assert.ok(Math.hypot(next.x-ORIGIN.x,next.y-ORIGIN.y)>=Math.hypot(old.x-ORIGIN.x,old.y-ORIGIN.y)+1000);
  game.exploration.next=next;game.exploration.gate++;game.exploration.departure={...old};
  game.exploration=JSON.parse(JSON.stringify(game.exploration));
  assert.ok(validExploration(game.exploration));assert.equal(canActivateGate(game),false);
  game.player={...next};assert.equal(canActivateGate(game),true);
 }
});
test('resident terrain is bounded and identical on return after distant travel',()=>{
 const game={player:{...ORIGIN}},initial=structuredClone(residentMap(game).obstacles);
 for(let i=1;i<=300;i++){
  game.player={x:800+i*1234,y:800-i*987};
  const map=residentMap(game);assert.ok(map.chunks.size<=49);
  for(const o of map.obstacles)assert.ok(Math.hypot(o.x+o.w/2-game.player.x,o.y+o.h/2-game.player.y)<1000);
 }
 game.player={...ORIGIN};assert.deepEqual(residentMap(game).obstacles,initial);
});
test('retention cutoff excludes exactly 1000 and resets an unloaded boss',()=>{
 const game={player:{...ORIGIN},enemies:[{x:1799,y:800,type:'normal',hp:1},{x:1800,y:800,type:'boss',hp:10}],bossId:'boss',bossSpawned:true,projectiles:[],enemyShots:[],gems:[],effects:[],texts:[]};
 releaseDistantEntities(game);assert.equal(game.enemies.length,1);assert.equal(game.bossId,null);assert.equal(game.bossSpawned,false);
});
