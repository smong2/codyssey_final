import test from 'node:test';
import assert from 'node:assert/strict';

function fakeAudioHarness({denyPlayback=false}={}){
 let time=0,nextId=0,denied=denyPlayback;
 const frames=[],tracks=[],soundErrors=[];
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
  onBlocked(){ },
  onSoundError(kind,error){soundErrors.push({kind,error});}
 });
 return {audio,tracks,frames,soundErrors,setTime(value){time=value;},allowPlayback(){denied=false;}};
}

const {createTitleAudioController,TITLE_BGM_TIMING,crossfadeGains,dialogueMusicKey}=await import('../src/core/title-audio.mjs');

test('adventure and minigame music loop, preserve the same track position and respect separate mute settings',()=>{
 const {audio,tracks}=fakeAudioHarness();
 audio.playMusic('map',0);
 const map=tracks.find(t=>t.source.endsWith('bgm_map.mp3'));
 assert.equal(map.loop,true);assert.equal(map.paused,false);map.currentTime=23;
 assert.equal(audio.playMusic('map',0),false);assert.equal(map.currentTime,23);
 audio.setBgmMuted(true);assert.equal(map.muted,true);
 audio.playMusic('minigame',0);
 const minigame=tracks.find(t=>t.source.endsWith('bgm_minigame.mp3'));
 assert.equal(minigame.loop,true);assert.equal(minigame.muted,true);assert.equal(map.paused,true);
 audio.setBgmMuted(false);assert.equal(minigame.muted,false);assert.equal(audio.isSfxMuted(),false);
});
test('dialogue music uses actual story identities without inventing inner-scene transitions',()=>{
 for(const [storyId,eventId,key] of [['MS01','MS01','admission'],['MS02','MS02','mysteryDetective'],['MS05','MS05','playful'],['MS06','MS06','winter'],['NPC_GUIDE','NPC_GUIDE_03','daily'],['NPC_WORK','NPC_WORK_02','calm'],['NPC_LULU','NPC_LULU_04','playful'],['LOC_OBS','LOC_OBS_02','observatory'],['LOC_GH','LOC_GH_01','calm'],['LOC_LIB','LOC_LIB_01','calm']])assert.equal(dialogueMusicKey({storyId,eventId}),key);
 assert.equal(dialogueMusicKey({storyId:'UNKNOWN',eventId:'other'}),null);
});

test('intro music is one-shot and title music loops',()=>{
 const {tracks}=fakeAudioHarness();
 assert.equal(tracks[0].loop,false);
 assert.equal(tracks[1].loop,true);
 assert.equal(tracks[2].loop,false);
 assert.equal(tracks[3].loop,true);
});

test('admission music stays active through the admission sequence and room entry changes to room music',()=>{
 const {audio,tracks}=fakeAudioHarness();
 audio.startTitle(0);
 audio.playMusic('admission',0,{restart:true});
 assert.equal(tracks[1].paused,true);
 assert.equal(tracks[2].paused,false);
 tracks[2].currentTime=37;
 audio.playMusic('admission',0);
 assert.equal(tracks[2].currentTime,37);
 audio.playMusic('room',0);
 assert.equal(tracks[2].paused,true);
 assert.equal(tracks[3].paused,false);
});

test('button click sound plays unless the shared mute control is active',async()=>{
 const {audio,tracks}=fakeAudioHarness();
 const click=tracks.find(track=>track.source.endsWith('sfx_button_press.mp3'));
 audio.playClick();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(click.playCount,1);
 audio.setMuted(true);
 audio.playClick();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(click.playCount,1);
 audio.setMuted(false);
 audio.playClick();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(click.playCount,2);
});

test('BGM and sound effects have independent mute controls',async()=>{
 const {audio,tracks}=fakeAudioHarness();
 const click=tracks.find(track=>track.source.endsWith('sfx_button_press.mp3'));
 audio.startTitle(0);
 audio.setBgmMuted(true);
 audio.playClick();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(tracks[1].muted,true);
 assert.equal(click.playCount,1);
 audio.setSfxMuted(true);
 audio.setBgmMuted(false);
 audio.playClick();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(tracks[1].muted,false);
 assert.equal(click.playCount,1);
});

test('diary entry uses its dedicated click sound',async()=>{
 const {audio,tracks}=fakeAudioHarness();
 const click=tracks.find(track=>track.source.endsWith('sfx_button_press.mp3'));
 const diary=tracks.find(track=>track.source.endsWith('sfx_diary_open.mp3'));
 audio.playClick('diary');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(diary.playCount,1);
 assert.equal(click.playCount,0);
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
 assert.equal(TITLE_BGM_TIMING.introEndFadeSeconds,6);
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

test('blocked autoplay stays separate from mute and an explicit resume enables playback',async()=>{
 const harness=fakeAudioHarness({denyPlayback:true});
 harness.audio.startIntro(0);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(harness.audio.isMuted(),false);assert.equal(harness.tracks[0].muted,false);
 harness.allowPlayback();harness.audio.resume();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(harness.audio.isMuted(),false);assert.equal(harness.tracks[0].paused,false);
});

test('a direct admission action recovers blocked autoplay without muting the new scene music',async()=>{
 const harness=fakeAudioHarness({denyPlayback:true});
 harness.audio.startTitle(0);await new Promise(resolve=>setImmediate(resolve));
 harness.allowPlayback();harness.audio.playMusic('admission',0,{restart:true});await new Promise(resolve=>setImmediate(resolve));
 const admission=harness.tracks.find(track=>track.source.endsWith('bgm_admission_invitation.mp3'));
 assert.equal(admission.paused,false);assert.equal(admission.muted,false);assert.equal(harness.audio.isBgmMuted(),false);
});

test('effect playback errors are reported instead of silently discarded',async()=>{
 const harness=fakeAudioHarness({denyPlayback:true});
 harness.audio.playClick();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(harness.soundErrors.length,1);assert.equal(harness.soundErrors[0].kind,'button');
});
