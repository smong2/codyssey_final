import test from 'node:test';
import assert from 'node:assert/strict';
test('video and overlaid title both begin their transition at 8 and video completes at 10',async()=>{
 const m=await import('../src/core/intro.mjs').catch(()=>({}));assert.equal(typeof m.introFrame,'function');
 for(const [time,opacity,titleVisible,complete] of [[0,1,false,false],[7.999,1,false,false],[8,1,true,false],[8.5,.75,true,false],[9,.5,true,false],[9.999,.0005,true,false],[10,0,true,true],[11,0,true,true]]){const f=m.introFrame(time);assert.ok(Math.abs(f.opacity-opacity)<1e-9);assert.equal(f.titleVisible,titleVisible);assert.equal(f.complete,complete);}
});
test('custom intro timing follows playback position rather than elapsed page time',async()=>{
 const m=await import('../src/core/intro.mjs').catch(()=>({}));assert.equal(typeof m.introFrame,'function');
 assert.deepEqual(m.introFrame(3,{fadeStartSeconds:2,fadeEndSeconds:6,titleStartSeconds:5}),{opacity:.75,titleVisible:false,complete:false});
 assert.deepEqual(m.introFrame(5,{fadeStartSeconds:2,fadeEndSeconds:6,titleStartSeconds:5}),{opacity:.25,titleVisible:true,complete:false});
 assert.throws(()=>m.introFrame(3,{fadeStartSeconds:7,fadeEndSeconds:7}));
 assert.throws(()=>m.introFrame(3,{fadeStartSeconds:8,fadeEndSeconds:10,titleStartSeconds:11}));
});
