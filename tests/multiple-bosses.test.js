import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile,loadProfile} from '../src/engine.js';
import {advanceStage,continuousRunBackup,settleRun} from '../src/transactions.js';

function encounter(){
 const profile=defaultProfile(),game=new Game(profile,{seed:27});
 game.time=90;game.spawnClock=100;game.attackClock=100;
 const bosses=[game.spawn('boss'),game.spawn('boss')];
 return {profile,game,bosses};
}
test('two bosses require both defeats in either order, and the surviving boss stays focused',()=>{
 for(const first of [0,1]){
  const {profile,game,bosses}=encounter();
  game.damageEnemy(bosses[first],1e6,false);
  assert.equal(game.state,'playing');assert.equal(game.kills,1);
  assert.equal(game.loot.length,1);assert.equal(game.materialLoot.length,1);
  assert.equal(game.currentBoss().id,bosses[1-first].id);assert.equal(game.livingBosses().length,1);
  assert.equal(advanceStage(profile,game,()=>{}).ok,false);
  game.damageEnemy(bosses[first],1e6,false);assert.equal(game.loot.length,1);
  game.damageEnemy(bosses[1-first],1e6,false);
  assert.equal(game.state,'won');assert.equal(game.kills,2);assert.equal(game.loot.length,2);assert.equal(game.currentBoss(),null);
 }
});
test('reload after the first boss preserves surviving boss, pending loot and final atomic settlement',()=>{
 const {profile,game,bosses}=encounter();game.skills.fire=2;
 game.damageEnemy(bosses[1],1e6,false);
 const saved=game.snapshot();game.bossId=bosses[1].id; // Old snapshots may still point at a defeated boss.
 saved.bossId=bosses[1].id;
 const restored=Game.restore(profile,saved);assert.ok(restored);assert.equal(restored.currentBoss().id,bosses[0].id);
 assert.equal(restored.loot.length,1);assert.equal(restored.skills.fire,2);
 restored.damageEnemy(restored.currentBoss(),1e6,false);profile.run=restored.snapshot();
 const before=JSON.stringify(profile);assert.equal(advanceStage(profile,restored,()=>{throw Error('quota');}).ok,false);assert.equal(JSON.stringify(profile),before);
 const backup=continuousRunBackup(profile,restored);assert.equal(backup.ok,true);assert.equal(backup.profile.history[0].kills,2);assert.equal(backup.profile.history[0].loot.length,2);
 const result=advanceStage(profile,restored,()=>{});assert.equal(result.ok,true);assert.equal(result.game.floor,2);assert.equal(result.game.skills.fire,2);
 const gold=profile.gold;assert.equal(advanceStage(profile,restored,()=>{}).ok,true);assert.equal(profile.gold,gold);assert.equal(loadProfile(profile).history.length,1);
});
test('one area attack can defeat both bosses once and freeze further rewards after victory',()=>{
 const {game,bosses}=encounter();game.worldVersion=0;
 for(const [i,b] of bosses.entries()){b.x=game.player.x+40+i*20;b.y=game.player.y;b.hp=1;}
 const extra=game.spawn('grunt');extra.x=game.player.x+30;extra.y=game.player.y;extra.hp=1;
 game.nova();assert.equal(game.state,'won');assert.equal(game.kills,2);assert.equal(game.loot.length,2);assert.equal(game.materialLoot.length,2);assert.equal(extra.hp,1);
});
test('time expiry with one boss alive loses and settles only earned rewards',()=>{
 const {profile,game,bosses}=encounter();game.damageEnemy(bosses[0],1e6,false);
 game.time=149.99;game.update(.02);assert.equal(game.state,'lost');assert.equal(game.livingBosses().length,1);
 assert.equal(settleRun(profile,game,()=>{}).ok,true);assert.equal(profile.best.clears,0);assert.equal(profile.history[0].loot.length,1);
});
