import assert from 'node:assert/strict';
import {Game,defaultProfile} from '../src/engine.js';
import {resolveChoices,automateAbilities} from '../src/automation.js';
import {advanceStage} from '../src/transactions.js';
import {nextGateLocation,residentMap,setWorldView} from '../src/exploration.js';
import {pursue,isWalkable} from '../src/world.js';

// Accelerated engine-only endurance check. Invulnerability and high damage
// keep this a persistence/progression test, not a balance or device FPS test.
const profile=defaultProfile();
let game=new Game(profile,{seed:41,exploration:true});
game.player.invulnerable=1e6;game.player.damage=1e6;
let saves=0,clears=0,failedWrites=0,peakEnemies=0,peakChunks=0,maxSaveBytes=0;
const comparable=snapshot=>{delete snapshot.effects;delete snapshot.texts;return snapshot;};
for(let frame=1;frame<=1200*60;frame++){
 const target=game.currentBoss()||nextGateLocation(game);
 pursue(game,game.player,target,game.player.speed/60);
 resolveChoices(game);automateAbilities(game,{x:0,y:0});
 game.player.invulnerable=1e6;
 if(game.state==='playing')game.update(1/60);
 assert.notEqual(game.state,'lost');
 assert.ok(isWalkable(game,game.player.x,game.player.y,game.player.r));
 peakEnemies=Math.max(peakEnemies,game.enemies.length);
 peakChunks=Math.max(peakChunks,residentMap(game).chunks.size);
 assert.ok(game.enemies.length<=101);assert.ok(residentMap(game).chunks.size<=49);
 if(game.state==='won'){
  const won=game;
  if(clears%5===0){
   const before=JSON.stringify(profile),run=JSON.stringify(won.snapshot());
   assert.equal(advanceStage(profile,won,()=>{throw Error('simulated quota');}).ok,false);
   assert.equal(JSON.stringify(profile),before);assert.equal(JSON.stringify(won.snapshot()),run);failedWrites++;
  }
  const result=advanceStage(profile,won,()=>{});assert.ok(result.ok,result.error);game=result.game;clears++;
  const settled=JSON.stringify(profile);
  assert.ok(advanceStage(profile,won,()=>{}).replayed);assert.equal(JSON.stringify(profile),settled);
 }
 if(frame%1800===0){
  const snapshot=JSON.parse(JSON.stringify(game.snapshot()));
  maxSaveBytes=Math.max(maxSaveBytes,Buffer.byteLength(JSON.stringify(snapshot)));
  const restored=Game.restore(profile,snapshot);assert.ok(restored);
  assert.deepEqual(comparable(restored.snapshot()),comparable(game.snapshot()));
  game=restored;setWorldView(game,300,650);saves++;
 }
}
assert.equal(saves,40);assert.ok(clears>=5);assert.ok(failedWrites>=1);
console.log(JSON.stringify({simulatedSeconds:1200,saves,clears,failedWrites,peakEnemies,peakChunks,maxSaveBytes,realDeviceTest:false},null,2));
