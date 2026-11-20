import test from 'node:test';
import assert from 'node:assert/strict';
import {MobileJoystick} from '../src/input.js';

test('orientation reset rejects stale pointer events and uses new viewport radius',()=>{
 const j=new MobileJoystick();
 j.begin(1,100,400,{width:390,height:844});j.move(1,217,400);
 assert.equal(j.x,1);
 j.reset();assert.equal(j.move(1,200,400),false);assert.equal(j.end(1),false);
 j.begin(2,400,100,{width:844,height:320});assert.equal(j.radius,96);
 assert.equal(j.x,0);assert.equal(j.y,0);
 j.move(2,400,196);assert.equal(j.y,1);
 assert.equal(j.end(1),false);assert.equal(j.y,1);
 j.end(2);assert.equal(j.y,0);
});
test('nonfinite pointer events cannot steal or alter movement',()=>{
 const j=new MobileJoystick(),rect={width:390,height:844};
 j.begin(1,100,200,rect);j.move(1,217,200);
 for(const value of [NaN,Infinity,-Infinity]){
  assert.equal(j.begin(2,value,200,rect),false);
  assert.equal(j.move(1,100,value),false);
  assert.equal(j.pointerId,1);assert.equal(j.x,1);
 }
 j.reset();assert.equal(j.pointerId,null);assert.equal(j.x,0);assert.equal(j.y,0);
});
