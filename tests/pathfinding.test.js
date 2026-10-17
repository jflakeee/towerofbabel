import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile} from '../src/engine.js';
import {gameObstacles,isWalkable,clearLine,safeSpawn,pursue} from '../src/world.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Independent Dijkstra oracle, measured backwards from the goal. The runtime
// A* may choose a different equal-cost route, but cannot choose a longer one.
function optimalRoutes(game,enemy){
 const nodes=[{x:enemy.x,y:enemy.y},{...game.player}];
 for(const o of gameObstacles(game)){
  const pad=enemy.r+3;
  for(const x of [o.x-pad,o.x+o.w+pad])for(const y of [o.y-pad,o.y+o.h+pad])
   if(isWalkable(game,x,y,enemy.r))nodes.push({x,y});
 }
 const costs=nodes.map(()=>Infinity),done=new Set();costs[1]=0;
 for(let n=0;n<nodes.length;n++){
  let at=-1;
  for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(at<0||costs[i]<costs[at]))at=i;
  if(at<0||!Number.isFinite(costs[at]))break;
  done.add(at);
  for(let i=0;i<nodes.length;i++)if(!done.has(i)&&clearLine(game,nodes[at],nodes[i],enemy.r+1))
   costs[i]=Math.min(costs[i],costs[at]+distance(nodes[i],nodes[at]));
 }
 return {nodes,costs};
}

test('A* first waypoints retain optimal visible paths for normal enemies, elites and guardians',()=>{
 for(const exploration of [false,true])for(const r of [12,24,35]){
  const g=new Game(defaultProfile(),{seed:41,exploration});
  if(exploration)Object.assign(g.player,{x:12000,y:-8000});
  const o=gameObstacles(g)[0],y=o.y+o.h/2;
  Object.assign(g.player,safeSpawn(g,o.x+o.w+r+30,y,g.player.r));
  const e=g.spawn('grunt');e.r=r;
  Object.assign(e,safeSpawn(g,o.x-r-30,y,r));
  assert.equal(clearLine(g,e,g.player,r+1),false);
  const start={x:e.x,y:e.y},oracle=optimalRoutes(g,e);
  assert.ok(Number.isFinite(oracle.costs[0]));
  pursue(g,e,g.player,0);
  assert.ok(e.route);assert.ok(clearLine(g,start,e.route,r+1));
  const index=oracle.nodes.findIndex(node=>distance(node,e.route)<1e-8);
  assert.ok(index>=0);
  assert.ok(Math.abs(distance(start,e.route)+oracle.costs[index]-oracle.costs[0])<1e-7);
  const restored=Game.restore(defaultProfile(),g.snapshot());assert.ok(restored);
  const resumed=restored.enemies.find(enemy=>enemy.id===e.id);
  for(let frame=0;frame<400;frame++){
   restored.time+=1/60;pursue(restored,resumed,restored.player,2);
   assert.ok(isWalkable(restored,resumed.x,resumed.y,resumed.r));
  }
  assert.ok(distance(resumed,restored.player)<5);
 }
});
