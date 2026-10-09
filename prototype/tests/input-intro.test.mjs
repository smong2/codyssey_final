import test from 'node:test';
import assert from 'node:assert/strict';
test('cancelled pointer gesture never suppresses keyboard card activation',async()=>{
 const {cardClickAllowed}=await import('../pointer-controls.mjs');
 assert.equal(cardClickAllowed(true,1),false);assert.equal(cardClickAllowed(true,0),true);assert.equal(cardClickAllowed(false,1),true);
});
test('drag cancellation prevents card tap and joystick normalizes diagonals',async()=>{
 const {tapAllowed,joystickVector,viewportSize}=await import('../pointer-controls.mjs');
 assert.equal(tapAllowed({x:0,y:0,time:0},{x:2,y:3,time:200}),true);
 assert.equal(tapAllowed({x:0,y:0,time:0},{x:0,y:30,time:100}),false);
 assert.equal(tapAllowed({x:0,y:0,time:0},{x:0,y:0,time:900}),false);
 assert.deepEqual(joystickVector(0,0,48),{x:0,y:0});
 const v=joystickVector(48,48,48);assert.ok(Math.abs(Math.hypot(v.x,v.y)-1)<1e-6);
 assert.deepEqual(viewportSize(375,667),{width:375,height:667});
 assert.deepEqual(viewportSize(2200,1200),{width:1280,height:698});
});
test('video ended completes once; playback rejection shows fallback then finishes',async()=>{
 const {attachIntro}=await import('../intro-player.mjs');
 class Video extends EventTarget{play(){return Promise.resolve()}pause(){}removeAttribute(){}load(){}}
 let completed=0,fallback=0;const timers=[];const video=new Video();
 const dispose=attachIntro(video,{complete:()=>completed++,fallback:()=>fallback++,schedule:fn=>{timers.push(fn);return timers.length},cancel:()=>{}});
 video.dispatchEvent(new Event('ended'));video.dispatchEvent(new Event('error'));
 assert.equal(completed,1);assert.equal(fallback,0);dispose();
 const bad=new Video();bad.play=()=>Promise.reject(Error('unsupported'));
 attachIntro(bad,{complete:()=>completed++,fallback:()=>fallback++,schedule:fn=>{timers.push(fn);return timers.length},cancel:()=>{}});
 await Promise.resolve();await Promise.resolve();assert.equal(fallback,1);timers.at(-1)();assert.equal(completed,2);
});
test('map revision relocates only old layout position and preserves discoveries',async()=>{
 const {enterWorld}=await import('../world-layout.mjs');
 const previous={position:{x:180,y:920},knowledge:['glassFlowerSoil'],herbs:1};
 const next=enterWorld(previous,{spawn:{x:900,y:990}});
 assert.deepEqual(next.position,{x:900,y:990});assert.deepEqual(next.knowledge,['glassFlowerSoil']);assert.equal(next.herbs,1);assert.deepEqual(previous.position,{x:180,y:920});
 next.position={x:1000,y:500};assert.deepEqual(enterWorld(next,{spawn:{x:900,y:990}}).position,{x:1000,y:500});
});
