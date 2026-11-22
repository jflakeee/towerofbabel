import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

const server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
let browser;
try{
 const url='http://127.0.0.1:8766/';
 let ready=false;
 for(let i=0;i<50;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}
 assert.ok(ready,'built game server unavailable');
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url,{waitUntil:'load'});
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload({waitUntil:'load'});
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 const result=await page.evaluate(async()=>{
  const marker='sw-browser-preserve-check';
  localStorage.setItem(marker,'keep-save');
  const keys=await caches.keys();
  const key=keys.find(k=>k.startsWith('babel-mobile-'));
  if(!key)throw Error('No game bundle cache');
  const cache=await caches.open(key);
  const entry=new URL('./index.html',location.href).href;
  await cache.put(entry,new Response('<!doctype html><title>STALE_CACHED_ENTRY</title>',{headers:{'Content-Type':'text/html'}}));
  return {marker:localStorage.getItem(marker),cacheKey:key};
 });
 assert.equal(result.marker,'keep-save');
 await page.goto(url,{waitUntil:'load'});
 assert.ok(!(await page.content()).includes('STALE_CACHED_ENTRY'),'Online navigation served stale cached entry');
 await context.setOffline(true);
 await page.goto(url,{waitUntil:'load'});
 const offline={body:await page.content(),marker:await page.evaluate(()=>localStorage.getItem('sw-browser-preserve-check'))};
 assert.ok(offline.body.includes('STALE_CACHED_ENTRY'),'offline navigation did not fall back to cached entry');
 assert.equal(offline.marker,'keep-save');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({serviceWorker:'online refresh / offline fallback',...result,offlineFallback:true,storagePreserved:true}));
}finally{await browser?.close();server.kill();}
