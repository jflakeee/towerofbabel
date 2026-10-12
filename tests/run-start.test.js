import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile,loadProfile,Game} from '../src/engine.js';
import {prepareRun} from '../src/transactions.js';
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
