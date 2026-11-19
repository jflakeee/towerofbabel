import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,defaultProfile} from '../src/engine.js';
import {advanceStage,continuousRunBackup} from '../src/transactions.js';
import {ProfileStore} from '../src/storage.js';

test('guardian settlement survives primary write failure, retry and reopening without duplicate rewards',async()=>{
 const data=new Map(),key='babel-mobile-v1';let fail=false;
 const storage={getItem:k=>data.get(k)??null,setItem(k,v){if(fail&&k===key)throw Error('quota');data.set(k,v);}};
 const locks={async request(name,options,callback){return callback({name});}};
 const store=new ProfileStore(storage,locks);
 let reopened;
 try{
  assert.equal(await store.open(),true);
  const p=defaultProfile(),g=new Game(p,{seed:17});
  g.state='won';g.gold=30;g.skills.fire=2;g.level=5;g.xp=3;p.run=g.snapshot();
  store.write(p);
  const original=structuredClone(p),raw=data.get(key),snapshot=g.snapshot();
  fail=true;
  assert.equal(advanceStage(p,g,d=>store.write(d)).ok,false);
  assert.deepEqual(p,original);assert.equal(data.get(key),raw);assert.deepEqual(g.snapshot(),snapshot);
  const backup=continuousRunBackup(p,g);assert.equal(backup.ok,true);
  fail=false;
  const result=advanceStage(p,g,d=>store.write(d));assert.equal(result.ok,true);
  assert.equal(p.gold,backup.profile.gold);assert.equal(p.history.length,1);
  assert.equal(p.revision,2);assert.equal(result.game.skills.fire,2);
  store.close();
  reopened=new ProfileStore(storage,locks);assert.equal(await reopened.open(),true);
  const restored=reopened.read().profile,oldGold=restored.gold,nextId=restored.run.runId;
  const replay=advanceStage(restored,g,d=>reopened.write(d));assert.equal(replay.ok,true);
  assert.equal(restored.gold,oldGold);assert.equal(restored.history.length,1);assert.equal(restored.run.runId,nextId);
 }finally{store.close();reopened?.close();}
});
