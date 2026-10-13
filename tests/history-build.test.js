import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile,Game,loadProfile,recordedSkills} from '../src/engine.js';
import {advanceStage,settleRun,applyHistoryBuild,editProfile} from '../src/transactions.js';
test('later-stage records retain the full inherited build even without new choices',()=>{
 const p=defaultProfile();let g=new Game(p,{seed:1});g.skills={fire:3,vitality:2,guardian:1};g.player.maxHp+=50;g.state='won';g=advanceStage(p,g,()=>{}).game;
 assert.deepEqual(g.decisionLog,[]);g.state='lost';assert.equal(settleRun(p,g,()=>{}).ok,true);
 const restored=loadProfile(p),record=restored.history.at(-1);assert.deepEqual(record.skills,g.skills);assert.deepEqual(record.decisions,[]);
 assert.equal(applyHistoryBuild(restored,record.id).ok,true);assert.deepEqual(restored.automation.priority,{vitality:4,fire:6,guardian:2});assert.equal(restored.selectedHero,'knight');assert.equal(restored.settings.strategy,'custom');
});
test('legacy decision records fall back safely and imported skill data respects class and bounds',()=>{
 assert.deepEqual(recordedSkills({hero:'mage',decisions:[{id:'fire'},{id:'fire'},{id:'guardian'},{id:'unknown'}]}),{fire:2});
 assert.deepEqual(recordedSkills({hero:'mage',skills:{fire:999,guardian:2,ice:-1,lightning:1.5,unknown:1}}),{fire:5});
 assert.deepEqual(recordedSkills({hero:'mage',skills:{},decisions:[{id:'fire'}]}),{});
});
test('empty history or failed template save cannot erase the existing build',()=>{
 const p=defaultProfile();p.automation.priority={fire:7};const before=JSON.stringify(p);
 assert.equal(editProfile(p,d=>applyHistoryBuild(d,'missing'),()=>{}).ok,false);assert.equal(JSON.stringify(p),before);
 p.history=[{id:'empty',hero:'knight',skills:{},decisions:[]}];const emptyBefore=JSON.stringify(p);assert.equal(editProfile(p,d=>applyHistoryBuild(d,'empty'),()=>{}).ok,false);assert.equal(JSON.stringify(p),emptyBefore);
 p.history=[{id:'valid',hero:'mage',skills:{ice:3},decisions:[]}];const savedBefore=JSON.stringify(p);assert.equal(editProfile(p,d=>applyHistoryBuild(d,'valid'),()=>{throw Error('quota');}).ok,false);assert.equal(JSON.stringify(p),savedBefore);
 assert.equal(editProfile(p,d=>applyHistoryBuild(d,'valid'),()=>{}).ok,true);assert.deepEqual(p.automation.priority,{ice:6});assert.equal(p.selectedHero,'mage');
});
