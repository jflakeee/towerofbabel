import {Game,defaultProfile,HEROES} from '../src/engine.js';
import {automateAbilities,resolveChoices} from '../src/automation.js';
const duration=120,dt=1/60;
for(const hero of Object.keys(HEROES)){
 const samples=[];
 for(const seed of [41,42,43,44,45]){
  const game=new Game(defaultProfile(),{hero,seed,runId:`audit-${hero}-${seed}`,exploration:true});
  const input={x:0,y:0};
  for(let frame=0;frame<duration*60&&['playing','choosing'].includes(game.state);frame++){
   resolveChoices(game);automateAbilities(game,input);game.update(dt,input);resolveChoices(game);
  }
  samples.push({seed,time:game.time,state:game.state,kills:game.kills,level:game.level,gold:game.gold,loot:game.loot.length,materials:game.materialLoot.length,hp:game.player.hp});
 }
 console.log(JSON.stringify({hero,scenario:'120s cap, stationary input with automatic abilities, fresh profile, no settlement',samples}));
}
