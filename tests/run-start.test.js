import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile,loadProfile,Game} from '../src/engine.js';
import {prepareRun,advanceStage} from '../src/transactions.js';
test('run creation and automatic upgrades use one successful save and apply the resulting stats',()=>{
 const p=defaultProfile();p.gold=500;p.automation.upgradeBudget=200;p.automation.reserve=400;let writes=0,saved;
 const result=prepareRun(p,{id:'start'},draft=>{writes++;saved=structuredClone(draft);});
 assert.equal(result.ok,true);assert.equal(writes,1);assert.equal(p.gold,440);assert.equal(p.upgrades.power,1);assert.equal(saved.run.player.damage,result.game.player.damage);assert.equal(saved.run.runId,result.game.runId);
 assert.equal(Game.restore(loadProfile(saved),saved.run).runId,result.game.runId);
});
test('failed new-stage save preserves currency, upgrades, floor and run; retry only charges once',()=>{
 const p=defaultProfile();p.unlocked=2;p.gold=500;p.automation.upgradeBudget=60;const before=JSON.stringify(p);
 assert.equal(prepareRun(p,{floor:2,id:'start'},()=>{throw Error('quota');}).ok,false);assert.equal(JSON.stringify(p),before);
 assert.equal(prepareRun(p,{floor:2,id:'start'},()=>{}).ok,true);assert.equal(p.gold,440);assert.equal(p.selectedFloor,2);
 const committed=JSON.stringify(p);assert.equal(prepareRun(p,{floor:2,id:'start'},()=>{}).ok,false);assert.equal(JSON.stringify(p),committed);
});
test('resume preserves run identity, frozen build and currency without buying upgrades again',()=>{
 const p=defaultProfile();p.gold=500;p.automation.upgradeBudget=60;const first=prepareRun(p,{id:'start'},()=>{}).game;
 p.automation.upgradeBudget=200;const gold=p.gold;const resumed=prepareRun(p,{resume:true},()=>{});
 assert.equal(resumed.ok,true);assert.equal(resumed.game.runId,first.runId);assert.deepEqual(resumed.game.automation,first.automation);assert.equal(p.gold,gold);
});
test('invalid or unreadable requests never write or discard the previous state',()=>{
 const p=defaultProfile();let writes=0;assert.equal(prepareRun(p,{floor:5},()=>writes++).ok,false);
 p.run={version:2,state:'broken'};const before=JSON.stringify(p);assert.equal(prepareRun(p,{resume:true},()=>writes++).ok,false);assert.equal(JSON.stringify(p),before);assert.equal(writes,0);
});


test('starting skill unlocks after floor three and respects user priority and exclusions',()=>{
 for(const unlocked of [3,4]){
  const p=defaultProfile();p.unlocked=unlocked;p.automation.priority.ice=10;p.automation.excluded=['fire'];
  const r=prepareRun(p,{id:'starter'},()=>{});assert.equal(r.ok,true);
  if(unlocked===3)assert.deepEqual(r.game.skills,{});
  else{assert.deepEqual(r.game.skills,{ice:1});assert.equal(r.game.level,1);assert.equal(r.game.xp,0);assert.equal(r.game.pendingLevels,0);assert.equal(r.game.state,'playing');assert.equal(r.game.decisionLog[0].source,'starting');assert.ok(r.game.decisionLog[0].reason.startsWith('시작 스킬'));}
 }
});
test('starter fallback records all-excluded policy and works for every hero',()=>{
 for(const hero of ['knight','mage','ranger']){
  const p=defaultProfile();p.unlocked=4;p.selectedHero=hero;p.automation.excluded=['fire','ice','lightning','orbit'];
  const r=prepareRun(p,{id:'starter'},()=>{});assert.equal(Object.keys(r.game.skills).length,1);assert.ok(r.game.decisionLog[0].reason.includes('유효 후보 대체'));assert.ok(Game.restore(p,p.run));
 }
});
test('starter is not granted again on resume or automatic stage transitions',()=>{
 const p=defaultProfile();p.unlocked=4;const g=prepareRun(p,{id:'starter'},()=>{}).game,skills=structuredClone(g.skills);
 assert.deepEqual(prepareRun(p,{resume:true},()=>{}).game.skills,skills);
 g.state='won';const next=advanceStage(p,g,()=>{});assert.equal(next.ok,true);assert.deepEqual(next.game.skills,skills);assert.equal(next.game.decisionLog.length,0);
});
test('failed starter save preserves the profile and retry grants only one skill',()=>{
 const p=defaultProfile();p.unlocked=4;const before=JSON.stringify(p);
 assert.equal(prepareRun(p,{id:'starter'},()=>{throw Error('quota');}).ok,false);assert.equal(JSON.stringify(p),before);
 const r=prepareRun(p,{id:'starter'},()=>{});assert.equal(Object.values(r.game.skills).reduce((a,b)=>a+b,0),1);assert.equal(r.game.decisionLog.length,1);
});
