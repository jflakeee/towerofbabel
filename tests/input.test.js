import test from 'node:test';
import assert from 'node:assert/strict';
import {MobileJoystick} from '../src/input.js';
const rect={left:0,top:0,width:160,height:160};
test('joystick has a center deadzone, analog speed and capped diagonal movement',()=>{
 const j=new MobileJoystick();j.begin(1,82,80,rect);assert.equal(j.x,0);
 j.move(1,104,80);assert.ok(j.x>0&&j.x<1);assert.equal(j.y,0);
 j.move(1,1000,-1000);assert.ok(Math.abs(Math.hypot(j.x,j.y)-1)<1e-12);assert.ok(Math.abs(Math.hypot(j.dx,j.dy)-48)<1e-12);assert.ok(j.x>0&&j.y<0);
 j.move(1,80,80);assert.equal(j.x,0);assert.equal(j.y,0);
});
test('a second finger cannot steal or cancel movement; release and reset stop immediately',()=>{
 const j=new MobileJoystick();assert.equal(j.begin(0,128,80,rect),true);
 assert.equal(j.begin(2,32,80,rect),false);assert.equal(j.move(2,32,80),false);assert.equal(j.end(2),false);assert.equal(j.x,1);
 assert.equal(j.end(0),true);assert.equal(j.x,0);assert.equal(j.pointerId,null);
 j.begin(2,80,128,rect);j.reset();assert.equal(j.move(2,0,0),false);assert.equal(j.y,0);assert.equal(j.dy,0);
});
