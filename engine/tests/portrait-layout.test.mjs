import test from 'node:test';
import assert from 'node:assert/strict';
import {fitPortraitBounds} from '../src/core/portrait-layout.mjs';
test('transparent margins do not leave the visible portrait floating above the dialogue',()=>{
 const p=fitPortraitBounds(600,400,1000,1500,{x:100,y:200,width:800,height:800});
 assert.deepEqual(p,{width:500,height:750,left:50,top:-100});
 assert.equal(p.top+(200+800)*0.5,400);
});
test('wide portraits fit horizontally and stay bottom aligned on a low landscape screen',()=>{
 const p=fitPortraitBounds(300,150,1000,1500,{x:0,y:100,width:1000,height:300});
 assert.deepEqual(p,{width:300,height:450,left:0,top:30});
});
