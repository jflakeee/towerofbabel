import test from 'node:test';
import assert from 'node:assert/strict';
import {CombatDiagnostics} from '../src/diagnostics.js';
test('frame measurements use real intervals and exclude background gaps',()=>{
 const d=new CombatDiagnostics();d.start({width:390});d.frame(0,5,2);for(let i=1;i<=60;i++)d.frame(i*1000/60,10,6);
 let s=d.summary();assert.equal(s.fps,60);assert.equal(s.frames,60);assert.equal(s.p95ms,17);assert.equal(s.peakEnemies,10);
 d.interrupt();d.frame(100000,3,1);d.frame(100100,3,1);s=d.summary();assert.equal(s.frames,61);assert.equal(s.maxFrameMs,100);assert.equal(s.slowFrames,1);assert.equal(s.seconds,1.1);
});
test('diagnostics count both touch sides, bound memory and reset for each run',()=>{
 const d=new CombatDiagnostics();d.touch(20,390);d.touch(380,390);d.cancel();d.frame(0);d.frame(2000);
 assert.equal(d.summary().p95Capped,true);assert.equal(d.summary().rightTouches,1);assert.equal(d.summary().leftTouches,1);assert.equal(d.histogram.length,1001);
 d.start({resumed:true});assert.equal(d.summary().frames,0);assert.equal(d.summary().fps,null);assert.equal(d.summary().rightTouches,0);
});
