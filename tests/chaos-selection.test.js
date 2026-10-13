import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile,loadProfile,Game,grantRewards} from '../src/engine.js';
import {normalizeJourney} from '../src/world.js';
import {advanceStage,continuousRunBackup} from '../src/transactions.js';
const chaos=(depth,max=20)=>{const p=defaultProfile();p.unlocked=5;p.journey=normalizeJourney({chaosUnlocked:true,mode:'chaos',chaosDepth:depth,chaosMaxDepth:max});return p;};
test('legacy chaos progress migrates into segments while explicit locked selections are clamped',()=>{
 for(const [depth,max] of [[1,5],[8,10],[16,20],[20,20]]){
  const p=defaultProfile();p.journey={chaosUnlocked:true,mode:'chaos',chaosDepth:depth};const restored=loadProfile(p);assert.equal(restored.journey.chaosDepth,depth);assert.equal(restored.journey.chaosMaxDepth,max);
 }
 assert.equal(normalizeJourney({chaosUnlocked:true,chaosDepth:20,chaosMaxDepth:5}).chaosDepth,5);
 assert.equal(normalizeJourney({mode:'chaos',chaosDepth:20}).mode,'tower');
});
test('tower completion opens first five chaos stages and boundary victories open the next segment',()=>{
 const p=defaultProfile(),g=new Game(p,{floor:5,seed:1});g.state='won';grantRewards(p,g);assert.equal(p.journey.chaosMaxDepth,5);
 for(const depth of [5,10,15,20]){const p=chaos(depth,depth),g=new Game(p,{seed:1});g.state='won';const r=advanceStage(p,g,()=>{});assert.equal(r.ok,true);assert.equal(p.journey.chaosMaxDepth,Math.min(20,depth+5));assert.equal(r.game.depth,Math.min(20,depth+1));}
});
test('replaying an earlier chaos stage preserves maximum unlock and advances from the played stage',()=>{
 const p=chaos(2,20),g=new Game(p,{seed:1});g.state='won';const r=advanceStage(p,g,()=>{});assert.equal(r.game.depth,3);assert.equal(p.journey.chaosMaxDepth,20);
 const restored=loadProfile(p);assert.equal(restored.journey.chaosDepth,3);assert.equal(restored.journey.chaosMaxDepth,20);
});
test('defeat and failed boundary saves cannot unlock additional chaos stages',()=>{
 const p=chaos(5,5),g=new Game(p,{seed:1});g.state='won';const before=JSON.stringify(p);assert.equal(advanceStage(p,g,()=>{throw Error('quota');}).ok,false);assert.equal(JSON.stringify(p),before);
 g.state='lost';grantRewards(p,g);assert.equal(p.journey.chaosDepth,5);assert.equal(p.journey.chaosMaxDepth,5);
});

test('cleared chaos depth migrates only from explicit valid victories, never from unlock or selection',()=>{
 const p=chaos(20);delete p.journey.chaosBestCleared;
 assert.equal(loadProfile(p).journey.chaosBestCleared,0);
 const record={id:'old',hero:'knight',state:'won',mode:'chaos',depth:7,floor:2,time:100,kills:10,gold:30};
 p.history=[record,{...record,id:'loss',state:'lost',depth:20},{...record,id:'tower',mode:'tower',depth:19},{...record,id:'invalid',depth:99}];
 assert.equal(loadProfile(p).journey.chaosBestCleared,7);
 for(const value of [-1,21,Infinity,'20',null,1.5])assert.equal(normalizeJourney({chaosBestCleared:value}).chaosBestCleared,0);
 p.journey.chaosBestCleared=15;assert.equal(loadProfile(p).journey.chaosBestCleared,15);
});
test('highest chaos victory survives history eviction, lower replay, defeat, and settings changes',()=>{
 const p=chaos(15),g=new Game(p,{seed:11});g.state='won';assert.equal(advanceStage(p,g,()=>{}).ok,true);assert.equal(p.journey.chaosBestCleared,15);
 for(let i=0;i<22;i++){p.journey.chaosDepth=1;const low=new Game(p,{seed:i});low.state=i%2?'won':'lost';grantRewards(p,low);}
 p.journey=normalizeJourney({...p.journey,chaosDepth:20});assert.equal(loadProfile(p).journey.chaosBestCleared,15);
 assert.equal(p.history.some(r=>r.depth===15),false);
});
test('cleared depth is atomic with rewards and preserved by recovery and replay',()=>{
 const p=chaos(10),g=new Game(p,{seed:12});g.state='won';p.run=g.snapshot();const before=JSON.stringify(p);
 assert.equal(advanceStage(p,g,()=>{throw Error('quota');}).ok,false);assert.equal(JSON.stringify(p),before);
 const backup=continuousRunBackup(p,g);assert.equal(backup.ok,true);assert.equal(backup.profile.journey.chaosBestCleared,10);assert.equal(p.journey.chaosBestCleared,0);
 assert.equal(advanceStage(p,g,()=>{}).ok,true);assert.equal(p.journey.chaosBestCleared,10);
 const gold=p.gold;assert.equal(advanceStage(p,g,()=>{}).ok,true);assert.equal(p.gold,gold);assert.equal(loadProfile(p).journey.chaosBestCleared,10);
});
