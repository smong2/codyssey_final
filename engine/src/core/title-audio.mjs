export const TITLE_BGM_TIMING=Object.freeze({
 introEndFadeSeconds:3,
 skipCrossfadeSeconds:.65,
 returnCrossfadeSeconds:.65
});

export function crossfadeGains(progress){
 const p=Math.max(0,Math.min(1,progress));
 if(p===0)return {intro:1,title:0};
 if(p===1)return {intro:0,title:1};
 return {intro:Math.cos(p*Math.PI/2),title:Math.sin(p*Math.PI/2)};
}

export function createTitleAudioController({
 createAudio=source=>new Audio(source),
 requestFrame=callback=>requestAnimationFrame(callback),
 cancelFrame=handle=>cancelAnimationFrame(handle),
 now=()=>performance.now(),
 setTimer=(callback,delay)=>setTimeout(callback,delay),
 clearTimer=handle=>clearTimeout(handle),
 onBlocked=()=>{}
}={}){
 const tracks={
  intro:createAudio('./audio-assets/bgm_title_intro.MP3'),
  title:createAudio('./audio-assets/bgm_title_main.mp3')
 };
 tracks.intro.loop=false;tracks.title.loop=true;
 for(const track of Object.values(tracks)){track.preload='auto';track.volume=0;track.muted=false;}
 let mix={intro:0,title:0},muted=false,blocked=false,frame=0,timer=0,introTransitionStarted=false,pending={intro:false,title:false};

 function play(key,gesture=false){
  const track=tracks[key];
  if(blocked&&!gesture||pending[key]||!track.paused)return;
  pending[key]=true;
  try{
   const result=track.play();
   if(result?.then)result.then(()=>{pending[key]=false;blocked=false;onBlocked(false);}).catch(()=>{pending[key]=false;blocked=true;onBlocked(true);});
   else pending[key]=false;
  }catch{pending[key]=false;blocked=true;onBlocked(true);}
 }
 function apply(next,pauseSilent=true){
  mix={intro:Math.max(0,Math.min(1,next.intro)),title:Math.max(0,Math.min(1,next.title))};
  for(const key of ['intro','title']){
   const track=tracks[key];track.volume=mix[key];track.muted=muted;
   if(mix[key]>.001){if(track.paused)play(key);}
   else if(pauseSilent&&!track.paused)track.pause();
  }
 }
 function cancelPending(){if(timer){clearTimer(timer);timer=0;}if(frame){cancelFrame(frame);frame=0;}}
 function transitionTo(target,durationSeconds,gesture=false,onComplete=()=>{}){
  if(frame){cancelFrame(frame);frame=0;}
  const from={...mix},duration=Math.max(0,durationSeconds)*1000,start=now();
  for(const key of ['intro','title'])if(target[key]>.001&&tracks[key].paused)play(key,gesture);
  if(!duration){apply(target);onComplete();return;}
  const tick=()=>{
   const p=Math.max(0,Math.min(1,(now()-start)/duration)),gains=crossfadeGains(p);
   apply({intro:from.intro*gains.intro+target.intro*gains.title,title:from.title*gains.intro+target.title*gains.title},false);
   if(p<1)frame=requestFrame(tick);else{frame=0;apply(target);onComplete();}
  };
  frame=requestFrame(tick);
 }
 function beginTitleTransition(durationSeconds=TITLE_BGM_TIMING.introEndFadeSeconds){
  if(introTransitionStarted)return;
  introTransitionStarted=true;
  try{tracks.title.currentTime=0;}catch{}
  transitionTo({intro:0,title:1},durationSeconds);
 }
 function onIntroTime(){
  const {currentTime,duration}=tracks.intro;
  if(!Number.isFinite(duration)||duration<=0)return;
  const remaining=duration-currentTime;
  if(remaining<=TITLE_BGM_TIMING.introEndFadeSeconds)beginTitleTransition(Math.max(.05,remaining));
 }
 tracks.intro.addEventListener?.('timeupdate',onIntroTime);
 tracks.intro.addEventListener?.('ended',()=>beginTitleTransition(TITLE_BGM_TIMING.skipCrossfadeSeconds));

 function startIntro(positionSeconds=0){
  cancelPending();introTransitionStarted=false;blocked=false;
  try{tracks.intro.currentTime=Math.max(0,positionSeconds);}catch{}
  const resetTitleAfterFade=mix.title>.001;
  transitionTo({intro:1,title:0},resetTitleAfterFade?TITLE_BGM_TIMING.returnCrossfadeSeconds:0,true,()=>{if(resetTitleAfterFade)try{tracks.title.currentTime=0;}catch{}});
 }
 function startTitle(durationSeconds=TITLE_BGM_TIMING.returnCrossfadeSeconds){cancelPending();introTransitionStarted=false;try{tracks.title.currentTime=0;}catch{}beginTitleTransition(durationSeconds);}
 function skipToTitle(){cancelPending();blocked=false;introTransitionStarted=true;try{tracks.title.currentTime=0;}catch{}transitionTo({intro:0,title:1},TITLE_BGM_TIMING.skipCrossfadeSeconds,true);}
 function syncIntroPosition(positionSeconds){
  if(!Number.isFinite(positionSeconds)||positionSeconds<0)return;
  const track=tracks.intro;
  if(Math.abs(track.currentTime-positionSeconds)>.25){try{track.currentTime=positionSeconds;}catch{}}
  onIntroTime();
 }
 function setMuted(value){muted=Boolean(value);apply(mix,false);if(!muted){for(const key of ['intro','title'])if(mix[key]>.001&&tracks[key].paused)play(key,true);}return muted;}
 function toggleMute(){return setMuted(!muted);}
 function isMuted(){return muted;}
 function resume(){blocked=false;for(const key of ['intro','title'])if(mix[key]>.001)play(key,true);}
 function stop(durationSeconds=.25){cancelPending();introTransitionStarted=false;transitionTo({intro:0,title:0},durationSeconds);}
 return {startIntro,startTitle,skipToTitle,syncIntroPosition,setMuted,toggleMute,isMuted,resume,stop};
}
