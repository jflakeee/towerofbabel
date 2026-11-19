import {Game,defaultProfile,HEROES} from '../src/engine.js';
import {automateAbilities,resolveChoices} from '../src/automation.js';
for(const hero of Object.keys(HEROES))for(const upgraded of [false,true]){
 const samples=[];
 for(const seed of [41,42,43,44,45]){
 const profile=defaultProfile();if(upgraded)for(const key of Object.keys(profile.upgrades))profile.upgrades[key]=10;
 const game=new Game(profile,{hero,seed,runId:`arena-audit-${hero}-${upgraded}-${seed}`,encounter:'dual-boss'});
 for(let frame=0;frame<18000&&['playing','choosing'].includes(game.state);frame++){
 const angle=Math.floor(frame/180)*Math.PI/2,input={x:Math.cos(angle),y:Math.sin(angle)};
 resolveChoices(game);automateAbilities(game,input);game.update(1/60,input);resolveChoices(game);
 }
 samples.push({seed,state:game.state,time:game.time,kills:game.kills,hp:game.player.hp});
 }
 const wins=samples.filter(s=>s.state==='won').length;
 console.log(JSON.stringify({hero,upgraded,samples,wins,hypotheticalNetShards:wins*90-samples.length*30,scenario:'isolated preview, default chaos progression, no gear, scripted movement; proposed rewards not granted'}));
}
