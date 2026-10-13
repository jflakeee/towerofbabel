import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile,SKILLS} from '../src/engine.js';
import {resolveChoices} from '../src/automation.js';
import {advanceStage,continuousRunBackup} from '../src/transactions.js';
function capped(hero='knight'){
 const p=defaultProfile();p.selectedHero=hero;const g=new Game(p,{seed:17});
 for(const s of SKILLS.filter(s=>!s.hero||s.hero===hero))g.skills[s.id]=s.max;
 g.player.maxHp=1000;g.player.hp=20;return {p,g};
}
test('capped growth heals per earned level equally for grouped and separate experience',()=>{
 for(const hero of ['knight','mage','ranger']){
  const {p,g}=capped(hero),other=capped(hero).g;
  g.gainXp(50);for(let i=0;i<10;i++)other.gainXp(5);
  assert.equal(g.level,5);assert.equal(g.player.hp,120);assert.equal(other.player.hp,g.player.hp);
  assert.equal(g.xp,other.xp);assert.equal(g.nextXp,other.nextXp);assert.equal(g.state,'playing');assert.equal(g.pendingLevels,0);
  assert.deepEqual(Game.restore(p,g.snapshot()).skills,g.skills);
 }
});
test('the last skill upgrade consumes one level and every remaining level heals once',()=>{
 const {g}=capped();g.skills.fire--;g.gainXp(50);const decisions=resolveChoices(g);
 assert.equal(decisions.length,1);assert.equal(decisions[0].id,'fire');assert.equal(g.skills.fire,5);
 assert.equal(g.player.hp,95);assert.equal(g.pendingLevels,0);assert.equal(g.state,'playing');
 g.offerChoices();assert.equal(g.player.hp,95);
});
test('capped healing respects maximum health and cannot be repeated after restoring',()=>{
 const {p,g}=capped();g.player.hp=990;g.gainXp(50);assert.equal(g.player.hp,1000);
 const restored=Game.restore(p,g.snapshot());restored.player.hp=900;restored.offerChoices();assert.equal(restored.player.hp,900);
});
test('victory sweep preserves capped growth healing through rollback, backup and replay',()=>{
 const {p,g}=capped();g.gems=[{x:1500,y:1500,value:50}];g.state='won';p.run=g.snapshot();
 const before=JSON.stringify(p),live=JSON.stringify(g.snapshot());
 assert.equal(advanceStage(p,g,()=>{throw Error('quota');}).ok,false);
 assert.equal(JSON.stringify(p),before);assert.equal(JSON.stringify(g.snapshot()),live);
 const backup=continuousRunBackup(p,g);assert.equal(backup.ok,true);assert.equal(backup.profile.run.player.hp,120);
 const result=advanceStage(p,g,()=>{});assert.equal(result.ok,true);assert.equal(result.game.player.hp,120);assert.equal(result.game.level,5);
 assert.equal(advanceStage(p,g,()=>{}).game.player.hp,120);assert.equal(p.history.length,1);
});
