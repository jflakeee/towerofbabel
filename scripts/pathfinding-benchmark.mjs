import {performance} from 'node:perf_hooks';
import {Game,defaultProfile} from '../src/engine.js';
import {pursue} from '../src/world.js';

// Synthetic CPU check, not a browser FPS or real-device performance claim.
const samples=[];
for(let run=0;run<6;run++){
 const game=new Game(defaultProfile(),{seed:41,exploration:true});
 Object.assign(game.player,{x:12000,y:-8000});
 for(let i=0;i<100;i++)game.spawn('grunt');
 const frames=[];
 for(let frame=0;frame<120;frame++){
  game.time+=1/60;
  const start=performance.now();
  for(const enemy of game.enemies)pursue(game,enemy,game.player,1);
  frames.push(performance.now()-start);
 }
 if(run){const totalMs=frames.reduce((a,b)=>a+b,0);frames.sort((a,b)=>a-b);samples.push({totalMs,p95Ms:frames[113],maxMs:frames.at(-1)});}
}
const median=key=>samples.map(s=>s[key]).sort((a,b)=>a-b)[2];
console.log(JSON.stringify({scenario:'100 enemies, 120 movement frames, stationary player; five warmed runs',totalMs:median('totalMs'),p95Ms:median('p95Ms'),maxMs:median('maxMs')},null,2));
