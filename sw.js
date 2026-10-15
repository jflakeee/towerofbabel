const CACHE_PREFIX='babel-mobile-'+new URL(self.registration.scope).pathname+'@';
const CACHE=CACHE_PREFIX+'development';
const ASSET_HASHES={}; // BUILD_ASSET_HASHES
const FILES=['./index.html','./styles.css','./src/diagnostics.js','./src/input.js','./src/app.js','./src/engine.js','./src/automation.js','./src/transactions.js','./src/content.js','./src/storage.js','./src/world.js','./src/exploration.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png'];
const assetURL=path=>new URL(path,self.registration.scope).href;
const paths=Object.keys(ASSET_HASHES).length?Object.keys(ASSET_HASHES):FILES;
const assets=new Map(paths.map(path=>[assetURL(path),path]));
async function installBundle(){
 const cache=await caches.open(CACHE);
 try{for(const path of paths){const response=await fetch(new Request(assetURL(path),{cache:'reload'}));if(!response.ok)throw Error('Incomplete game download');const expected=ASSET_HASHES[path];if(expected){const digest=await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer());const actual=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');if(actual!==expected)throw Error('Mixed game versions');}await cache.put(assetURL(path),response);}}
 catch(error){await caches.delete(CACHE);throw error;}
}
self.addEventListener('install',event=>event.waitUntil(installBundle()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(CACHE_PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='APPLY_UPDATE')event.waitUntil(self.skipWaiting());if(event.data?.type==='BUNDLE_STATUS'&&event.ports?.[0])event.waitUntil((async()=>{const cache=await caches.open(CACHE);const present=await Promise.all(paths.map(path=>cache.match(assetURL(path))));event.ports[0].postMessage({ready:present.every(Boolean),build:CACHE.slice(CACHE_PREFIX.length)});})());});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;const url=new URL(event.request.url),scope=new URL(self.registration.scope);if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 url.search='';url.hash='';let key=url.href;if(event.request.mode==='navigate'&&(url.pathname===scope.pathname||url.pathname===scope.pathname+'index.html'))key=assetURL('./index.html');
 if(!assets.has(key))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match(key);if(cached)return cached;try{const response=await fetch(new Request(key,{cache:'reload'}));if(!response.ok)throw Error('Missing asset');const expected=ASSET_HASHES[assets.get(key)];if(expected){const digest=await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer());const actual=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');if(actual!==expected)throw Error('Wrong version');}await cache.put(key,response.clone());return response;}catch{}return new Response('게임 파일이 없습니다. 온라인에서 다시 열어 주세요.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});})());
});
