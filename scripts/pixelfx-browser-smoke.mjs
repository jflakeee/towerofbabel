import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
let browser;
try{
 const base='http://127.0.0.1:8765/dev/pixelfx-preview.html';
 let ready=false;
 for(let i=0;i<40;i++){
  try{const r=await fetch(base);if(r.ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 assert.ok(ready,'preview server did not start');
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Frost nova'));
 await page.waitForTimeout(1100);
 async function check(label,filename){
  const result=await page.locator('canvas').evaluate(canvas=>{
   const ctx=canvas.getContext('2d'),data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   let visible=0,opaque=0;
   for(let i=0;i<data.length;i+=4){
    if(data[i+3]===255)opaque++;
    if(data[i]!==17||data[i+1]!==29||data[i+2]!==41)visible++;
   }
   return {visible,opaque,pixels:canvas.width*canvas.height};
  });
  assert.equal(result.opaque,result.pixels,label+' non-opaque pixels');
  assert.ok(result.visible>20,label+' no visible effect pixels');
  await page.locator('canvas').screenshot({path:filename});
  console.log(JSON.stringify({effect:label,...result,screenshot:filename}));
 }
 await check('Frost nova','pixelfx-frost-mobile.png');
 await page.getByRole('button',{name:'연쇄 번개'}).click();
 await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('Chain lightning'));
 await page.waitForTimeout(600);
 await check('Chain lightning','pixelfx-lightning-mobile.png');
 await page.getByRole('button',{name:'일시 정지'}).click();
 assert.equal(await page.getByRole('button',{name:'재생',exact:true}).count(),1);
 await page.getByRole('button',{name:'재생',exact:true}).click();
 await page.getByRole('button',{name:'다시 재생'}).click();
 // Exercise repeated switching and verify the preview does not leak RAF loops or fail.
 for(let i=0;i<12;i++){
  await page.getByRole('button',{name:i%2?'서리 폭발':'연쇄 번개'}).click();
  await page.waitForTimeout(80);
 }
 const metrics=await page.evaluate(()=>({
  width:document.documentElement.scrollWidth,
  viewport:window.innerWidth,
  canvasWidth:document.querySelector('canvas').width,
  canvasHeight:document.querySelector('canvas').height,
  status:document.querySelector('#status').textContent
 }));
 assert.ok(metrics.width<=metrics.viewport+1,'mobile horizontal overflow');
 assert.equal(metrics.canvasWidth,288);
 assert.equal(metrics.canvasHeight,192);
 assert.ok(metrics.status.includes('Frost nova'));
 console.log(JSON.stringify({mobilePreview:metrics,rapidSwitches:12}));
 assert.deepEqual(errors,[],'browser errors');
 console.log('PixelFX Chromium mobile-viewport preview passed');
}finally{
 await browser?.close();
 server.kill();
}
