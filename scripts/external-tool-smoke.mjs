import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const readJson=path=>JSON.parse(readFileSync(path,'utf8'));
const kit=readJson('external/claude-gamedev-kit/.claude-plugin/plugin.json');
const audio=readJson('external/plinkfx/package.json');
const visual=readJson('external/pixelfx/package.json');
assert.equal(kit.name,'gamedev-kit');
assert.equal(audio.name,'plinkfx');
assert.equal(visual.name,'pixelfx');
assert.equal(visual.type,'module');
assert.ok(existsSync('external/dream-loop/SKILL.md'));

const core=await import(pathToFileURL(resolve('external/pixelfx/src/core/index.js')).href);
for(const name of ['createFrame','createFx','Painter','Rng'])assert.equal(typeof core[name], 'function', name);
for(const [path,expected] of [
 ['external/pixelfx/src/fx/ice/frost-nova.js','Frost nova'],
 ['external/pixelfx/src/fx/lightning/chain-lightning.js','Chain lightning']
]){
 const effect=await import(pathToFileURL(resolve(path)).href);
 assert.equal(effect.meta.name,expected);
 assert.ok(effect.meta.duration>0);
 assert.equal(typeof effect.create,'function');
 const fx=core.createFx(effect,{x:144,y:96,seed:4});
 const frame=core.createFrame(288,192);
 const rgba=new Uint8ClampedArray(frame.w*frame.h*4);
 let nonEmpty=0;
 for(let i=0;i<10;i++){
  core.clearFrame(frame);
  fx.update(1/30);
  fx.draw(frame);
  core.composite(frame,rgba);
  nonEmpty+=rgba.some(v=>v!==0)?1:0;
 }
 assert.ok(nonEmpty>0,expected+' produced no visible pixels');
 console.log(JSON.stringify({effect:effect.meta.name,duration:effect.meta.duration,renderedFrames:10,nonEmptyFrames:nonEmpty,source:path}));
}
console.log('External game tooling import smoke check passed (no runtime/game modification)');
