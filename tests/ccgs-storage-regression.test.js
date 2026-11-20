import test from 'node:test';
import assert from 'node:assert/strict';
import {ProfileStore,readStored} from '../src/storage.js';

const key='babel-mobile-v1';
const profile=(version=2,gold=0)=>({version,gold,inventory:[]});
class Storage {
  data=new Map();
  failKey=null;
  getItem(k){return this.data.get(k)??null;}
  setItem(k,v){if(k===this.failKey)throw Error('injected write failure');this.data.set(k,String(v));}
}
class Locks {
  async request(name,options,callback){return callback({name});}
}

for(const failure of [key,key+'-backup']){
  test('write failure at '+failure+' permits one revision on retry',async()=>{
    const storage=new Storage(),store=new ProfileStore(storage,new Locks());
    try{
      assert.equal(await store.open(),true);
      const original=profile(2,12);store.write(original);
      const before=storage.getItem(key),draft={...original,gold:50};
      storage.failKey=failure;
      assert.throws(()=>store.write(draft),/injected/);
      assert.equal(storage.getItem(key),before);
      assert.equal(store.revision,1);
      assert.equal(draft.revision,1);
      storage.failKey=null;
      store.write(draft);
      assert.equal(store.revision,2);
      assert.equal(draft.revision,2);
      assert.equal(store.read().profile.gold,50);
      assert.equal(JSON.parse(storage.getItem(key+'-backup')).gold,12);
    }finally{store.close();}
  });
}
test('legacy v1 primary can be read without mutating storage',()=>{
  const storage=new Storage(),raw=JSON.stringify(profile(1,75));
  storage.setItem(key,raw);
  assert.deepEqual(readStored(storage,key),{profile:profile(1,75),recovered:false,blocked:false,unsupported:false});
  assert.equal(storage.getItem(key),raw);
});
test('future primary with valid legacy backup remains blocked and unchanged',async()=>{
  const storage=new Storage(),future=JSON.stringify(profile(3,99)),legacy=JSON.stringify(profile(1,20));
  storage.setItem(key,future);storage.setItem(key+'-backup',legacy);
  const store=new ProfileStore(storage,new Locks());
  try{
    assert.equal(await store.open(),false);
    assert.equal(store.read().unsupported,true);
    assert.throws(()=>store.write(profile()));
    assert.deepEqual(store.raw(),{primary:future,backup:legacy});
  }finally{store.close();}
});
