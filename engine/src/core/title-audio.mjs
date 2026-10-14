export const TITLE_BGM_TIMING=Object.freeze({
 introEndFadeSeconds:6,
 skipCrossfadeSeconds:.65,
 returnCrossfadeSeconds:.65,
 sceneCrossfadeSeconds:.8
});

const MUSIC_KEYS=['intro','title','admission','room'];
const TRACK_URLS={
 intro:'./audio-assets/bgm_title_intro.MP3',
 title:'./audio-assets/bgm_title_main.mp3',
 admission:'./audio-assets/bgm_admission_invitation.mp3',
 room:'./audio-assets/bgm_myroom.mp3',
 click:'./audio-assets/sfx_button_click.mp3',
 diary:'./audio-assets/sfx_diary_open.mp3'
};

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
 onBlocked=()=>{},
 onSoundError=()=>{}
}={}){
 const tracks=Object.fromEntries(Object.entries(TRACK_URLS).map(([key,url])=>[key,createAudio(url)]));
 for(const key of MUSIC_KEYS){tracks[key].loop=key==='title'||key==='room';tracks[key].preload='auto';tracks[key].volume=0;tracks[key].muted=false;}
 for(const key of ['click','diary']){tracks[key].loop=false;tracks[key].preload='auto';tracks[key].volume=1;tracks[key].muted=false;}
 let mix=Object.fromEntries(MUSIC_KEYS.map(key=>[key,0])),bgmMuted=false,sfxMuted=false,blocked=false,frame=0,timer=0,introTransitionStarted=false,activeMusicKey=null,pending=Object.fromEntries(Object.keys(TRACK_URLS).map(key=>[key,false]));

 function play(key,gesture=false){
  const track=tracks[key];
  if(blocked&&!gesture||pending[key]||!track.paused)return;
  pending[key]=true;
  try{
   const result=track.play();
   if(result?.then)result.then(()=>{pending[key]=false;if(key!=='click'){blocked=false;onBlocked(false);}}).catch(()=>{pending[key]=false;if(key!=='click'){blocked=true;onBlocked(true);}});
   else pending[key]=false;
  }catch{pending[key]=false;if(key!=='click'){blocked=true;onBlocked(true);}}
 }
 function apply(next,pauseSilent=true){
  mix=Object.fromEntries(MUSIC_KEYS.map(key=>[key,Math.max(0,Math.min(1,next[key]??0))]));
  for(const key of MUSIC_KEYS){
   const track=tracks[key];track.volume=mix[key];track.muted=bgmMuted;
   if(mix[key]>.001){if(track.paused)play(key);}
   else if(pauseSilent&&!track.paused)track.pause();
  }
  tracks.click.muted=sfxMuted;tracks.diary.muted=sfxMuted;
 }
 function cancelPending(){if(timer){clearTimer(timer);timer=0;}if(frame){cancelFrame(frame);frame=0;}}
 function transitionTo(target,durationSeconds,gesture=false,onComplete=()=>{}){
  if(frame){cancelFrame(frame);frame=0;}
  const from={...mix},normalized=Object.fromEntries(MUSIC_KEYS.map(key=>[key,Math.max(0,Math.min(1,target[key]??0))])),duration=Math.max(0,durationSeconds)*1000,start=now();
  for(const key of MUSIC_KEYS)if(normalized[key]>.001&&tracks[key].paused)play(key,gesture);
  if(!duration){apply(normalized);onComplete();return;}
  const tick=()=>{
   const p=Math.max(0,Math.min(1,(now()-start)/duration)),outgoing=Math.cos(p*Math.PI/2),incoming=Math.sin(p*Math.PI/2),next={};
   for(const key of MUSIC_KEYS)next[key]=from[key]*outgoing+normalized[key]*incoming;
   apply(next,false);
   if(p<1)frame=requestFrame(tick);else{frame=0;apply(normalized);onComplete();}
  };
  frame=requestFrame(tick);
 }
 function beginTitleTransition(durationSeconds=TITLE_BGM_TIMING.introEndFadeSeconds){
  if(introTransitionStarted)return;
  introTransitionStarted=true;activeMusicKey='title';
  try{tracks.title.currentTime=0;}catch{}
  transitionTo({title:1},durationSeconds);
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
  cancelPending();introTransitionStarted=false;activeMusicKey='intro';blocked=false;
  try{tracks.intro.currentTime=Math.max(0,positionSeconds);}catch{}
  const resetTitleAfterFade=mix.title>.001;
  transitionTo({intro:1},resetTitleAfterFade?TITLE_BGM_TIMING.returnCrossfadeSeconds:0,true,()=>{if(resetTitleAfterFade)try{tracks.title.currentTime=0;}catch{}});
 }
 function startTitle(durationSeconds=TITLE_BGM_TIMING.returnCrossfadeSeconds){cancelPending();introTransitionStarted=false;try{tracks.title.currentTime=0;}catch{}beginTitleTransition(durationSeconds);}
 function skipToTitle(){cancelPending();blocked=false;introTransitionStarted=true;activeMusicKey='title';try{tracks.title.currentTime=0;}catch{}transitionTo({title:1},TITLE_BGM_TIMING.skipCrossfadeSeconds,true);}
 function syncIntroPosition(positionSeconds){
  if(!Number.isFinite(positionSeconds)||positionSeconds<0)return;
  const track=tracks.intro;
  if(Math.abs(track.currentTime-positionSeconds)>.25){try{track.currentTime=positionSeconds;}catch{}}
  onIntroTime();
 }
 function playMusic(key,durationSeconds=TITLE_BGM_TIMING.sceneCrossfadeSeconds,{restart=false}={}){
  if(!MUSIC_KEYS.includes(key))throw new Error('등록되지 않은 음악 트랙입니다.');
  if(activeMusicKey===key){if(restart){try{tracks[key].currentTime=0;}catch{}}return false;}
  cancelPending();introTransitionStarted=true;activeMusicKey=key;
  if(restart)try{tracks[key].currentTime=0;}catch{}
  transitionTo({[key]:1},durationSeconds,true);
  return true;
 }
 function playClick(kind='button'){
  if(sfxMuted)return false;
  const track=tracks[kind==='diary'?'diary':'click'];try{track.currentTime=0;}catch{}
  const report=error=>{onSoundError(kind,error);return false;};
  try{const result=track.play();return result?.then?result.then(()=>true,report):true;}catch(error){return report(error);}
 }
 function setBgmMuted(value){bgmMuted=Boolean(value);apply(mix,false);if(!bgmMuted){for(const key of MUSIC_KEYS)if(mix[key]>.001&&tracks[key].paused)play(key,true);}return bgmMuted;}
 function toggleBgmMute(){return setBgmMuted(!bgmMuted);}
 function isBgmMuted(){return bgmMuted;}
 function setSfxMuted(value){sfxMuted=Boolean(value);tracks.click.muted=sfxMuted;tracks.diary.muted=sfxMuted;return sfxMuted;}
 function toggleSfxMute(){return setSfxMuted(!sfxMuted);}
 function isSfxMuted(){return sfxMuted;}
 function setMuted(value){setSfxMuted(value);return setBgmMuted(value);}
 function toggleMute(){const next=!(bgmMuted&&sfxMuted);setBgmMuted(next);setSfxMuted(next);return next;}
 function isMuted(){return bgmMuted;}
 function resume(){blocked=false;if(!bgmMuted)for(const key of MUSIC_KEYS)if(mix[key]>.001)play(key,true);}
 function isBlocked(){return blocked;}
 function stop(durationSeconds=.25){cancelPending();introTransitionStarted=false;activeMusicKey=null;transitionTo({},durationSeconds);}
 return {startIntro,startTitle,skipToTitle,syncIntroPosition,playMusic,playClick,setBgmMuted,toggleBgmMute,isBgmMuted,setSfxMuted,toggleSfxMute,isSfxMuted,setMuted,toggleMute,isMuted,resume,isBlocked,stop};
}
