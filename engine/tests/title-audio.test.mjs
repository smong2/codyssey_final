import test from 'node:test';
import assert from 'node:assert/strict';

function fakeAudioHarness({denyPlayback=false}={}){
 let time=0,nextId=0,denied=denyPlayback;
 const frames=[],tracks=[];
 let audio;
 audio=createTitleAudioController({
  createAudio(source){
   const listeners=new Map();
   const track={source,paused:true,currentTime:0,duration:20,volume:0,muted:false,loop:false,playCount:0,
    play(){if(denied)return Promise.reject(new Error('autoplay blocked'));this.paused=false;this.playCount++;return Promise.resolve();},
    pause(){this.paused=true;},
    addEventListener(name,callback){const callbacks=listeners.get(name)??[];callbacks.push(callback);listeners.set(name,callbacks);},
    fire(name){for(const callback of listeners.get(name)??[])callback();}
   };
   tracks.push(track);return track;
  },
  now:()=>time,
  requestFrame(callback){const frame={id:++nextId,callback,cancelled:false};frames.push(frame);return frame.id;},
  cancelFrame(id){const frame=frames.find(item=>item.id===id);if(frame)frame.cancelled=true;},
  onBlocked(blocked){if(blocked&&!audio.isMuted())audio.setMuted(true);}
 });
 return {audio,tracks,frames,setTime(value){time=value;},allowPlayback(){denied=false;}};
}

const {createTitleAudioController,TITLE_BGM_TIMING,crossfadeGains}=await import('../src/core/title-audio.mjs');

test('intro music is one-shot and title music loops',()=>{
 const {tracks}=fakeAudioHarness();
 assert.equal(tracks[0].loop,false);
 assert.equal(tracks[1].loop,true);
});

test('crossfade gains are equal-power',()=>{
 assert.deepEqual(crossfadeGains(0),{intro:1,title:0});
 const middle=crossfadeGains(.5);
 assert.ok(Math.abs(middle.intro-Math.SQRT1_2)<1e-9);
 assert.ok(Math.abs(middle.title-Math.SQRT1_2)<1e-9);
 assert.deepEqual(crossfadeGains(1),{intro:0,title:1});
});

test('main music starts fading in shortly before the intro track ends',()=>{
 const {audio,tracks,frames,setTime}=fakeAudioHarness();
 assert.equal(TITLE_BGM_TIMING.introEndFadeSeconds,3);
 audio.startIntro(0);
 tracks[0].duration=20;tracks[0].currentTime=20-TITLE_BGM_TIMING.introEndFadeSeconds-.01;tracks[0].fire('timeupdate');assert.equal(tracks[1].paused,true);
 tracks[0].currentTime=20-TITLE_BGM_TIMING.introEndFadeSeconds+.01;tracks[0].fire('timeupdate');
 assert.equal(tracks[1].currentTime,0);
 assert.equal(tracks[1].paused,false);
 assert.equal(tracks[0].paused,false);
 setTime((TITLE_BGM_TIMING.introEndFadeSeconds-.01)*500);
 const active=frames.find(frame=>!frame.cancelled);assert.ok(active);active.cancelled=true;active.callback();
 assert.ok(tracks[0].volume<1);assert.ok(tracks[1].volume>0);
});

test('replaying intro lets main music fade out at its current point, then resets it for the next title',()=>{
 const {audio,tracks,frames,setTime}=fakeAudioHarness();
 audio.startTitle(0);tracks[1].currentTime=73;
 audio.startIntro(0);
 assert.equal(audio.isMuted(),false);
 assert.equal(tracks[1].currentTime,73);
 setTime(TITLE_BGM_TIMING.returnCrossfadeSeconds*1000);
 const active=frames.find(frame=>!frame.cancelled);assert.ok(active);active.cancelled=true;active.callback();
 assert.equal(tracks[1].currentTime,0);
});

test('mute toggle preserves track playback and toggles both tracks',()=>{
 const {audio,tracks}=fakeAudioHarness();
 audio.startIntro(0);
 assert.equal(audio.toggleMute(),true);
 assert.equal(tracks[0].muted,true);
 assert.equal(tracks[0].paused,false);
 assert.equal(audio.toggleMute(),false);
 assert.equal(tracks[0].muted,false);
});

test('skip resets main music to zero and crossfades out the intro',()=>{
 const {audio,tracks,frames,setTime}=fakeAudioHarness();
 tracks[1].currentTime=73;
 audio.startIntro(4);audio.skipToTitle();
 assert.equal(tracks[1].currentTime,0);
 assert.equal(tracks[1].paused,false);
 assert.equal(tracks[0].paused,false);
 setTime(TITLE_BGM_TIMING.skipCrossfadeSeconds*500);
 const active=frames.find(frame=>!frame.cancelled);assert.ok(active);active.cancelled=true;active.callback();
 assert.ok(Math.abs(tracks[0].volume-Math.SQRT1_2)<1e-9);
 assert.ok(Math.abs(tracks[1].volume-Math.SQRT1_2)<1e-9);
});

test('intro end event starts title music if metadata timing was unavailable',()=>{
 const {audio,tracks}=fakeAudioHarness();
 audio.startIntro(0);tracks[0].duration=Number.NaN;tracks[0].fire('ended');
 assert.equal(tracks[1].currentTime,0);
 assert.equal(tracks[1].paused,false);
});

test('blocked autoplay is reflected as muted so one icon click enables playback',async()=>{
 const harness=fakeAudioHarness({denyPlayback:true});
 harness.audio.startIntro(0);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(harness.audio.isMuted(),true);assert.equal(harness.tracks[0].muted,true);
 harness.allowPlayback();harness.audio.toggleMute();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(harness.audio.isMuted(),false);assert.equal(harness.tracks[0].paused,false);
});
