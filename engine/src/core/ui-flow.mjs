export function createPageTurnGate(){
 let generation=0,busy=false;
 return {reset(){generation++;busy=false;},begin(commit){
  if(busy)return null;busy=true;const active=generation;
  return ()=>{if(active!==generation||!busy)return;busy=false;commit();};
 }};
}
export function createJoystickInput({pad,knob,onDirection,isEnabled=()=>true}){
 let pointerId=null;
 const environment=pad.ownerDocument?.defaultView,document=pad.ownerDocument;
 const reset=()=>{const previous=pointerId;pointerId=null;knob.style.transform='';onDirection(0,0);if(previous!==null&&pad.hasPointerCapture?.(previous))pad.releasePointerCapture(previous);};
 const move=event=>{
  if(event.pointerId!==pointerId)return;
  if(!pad.isConnected||!isEnabled()){reset();return;}
  const rect=pad.getBoundingClientRect(),size=Math.min(rect.width,rect.height),radius=size*.4;
  if(radius<=0){reset();return;}
  const dx=event.clientX-rect.left-rect.width/2,dy=event.clientY-rect.top-rect.height/2,length=Math.hypot(dx,dy),scale=Math.max(radius,length);
  const x=length<radius*.12?0:dx/scale,y=length<radius*.12?0:dy/scale;
  knob.style.transform=`translate(${x*size*.28}px,${y*size*.28}px)`;onDirection(x,y);
 };
 pad.onpointerdown=event=>{if(pointerId!==null||!pad.isConnected||!isEnabled()||(event.button!==undefined&&event.button!==0))return;event.preventDefault();event.stopPropagation?.();pointerId=event.pointerId;pad.setPointerCapture(pointerId);move(event);};
 pad.onpointermove=move;
 const finish=event=>{if(event.pointerId===pointerId)reset();};
 pad.onpointerup=finish;pad.onpointercancel=finish;pad.onlostpointercapture=finish;
 environment?.addEventListener('blur',reset);document?.addEventListener('visibilitychange',reset);
 return {reset,destroy(){reset();pad.onpointerdown=pad.onpointermove=pad.onpointerup=pad.onpointercancel=pad.onlostpointercapture=null;environment?.removeEventListener('blur',reset);document?.removeEventListener('visibilitychange',reset);}};
}
export const firstEmptySlot=profile=>profile.slots.find(s=>s.status==='EMPTY')??null;
export function recentSlot(profile){
 const recorded=profile.slots.find(s=>s.slotId===profile.meta.lastSavedSlotId&&s.status!=='EMPTY');
 if(recorded)return recorded;
 return profile.slots.filter(s=>s.status!=='EMPTY'&&Number.isFinite(Date.parse(s.lastSavedAt))).sort((a,b)=>Date.parse(b.lastSavedAt)-Date.parse(a.lastSavedAt))[0]??null;
}
export function createNotifier(target,schedule=setTimeout,cancel=clearTimeout){
 let timer;return text=>{cancel(timer);target.textContent=text;const duration=text.length>65?5000:3000;
  target.style?.setProperty('--notice-duration',duration+'ms');target.classList?.remove('toast-visible');void target.offsetWidth;target.classList?.add('toast-visible');
  timer=schedule(()=>{target.textContent='';target.classList?.remove('toast-visible');},duration);
 };
}
// Exact copy.admission text from prototype/content.json, restored by user request.
export const invitationLines=name=>[name+'에게','아르카디아에 온 것을 환영합니다.','이곳에서는 신비한 룬과 여러 친구들이 당신을 기다리고 있습니다.','이제, 당신의 이야기를 시작해 보세요.'];
// Scene purpose/flow from story/main/09_MAIN_STORY_SCENARIO.md §3.
// These are outline frames, not authored dialogue or completed story events.
export const ADMISSION_SCENES=[
 {id:'admission-motive',title:'각자의 이유로 아카데미에',outline:'선택한 학생의 배경과 연결된 입학 동기',missing:'캐릭터별 입학 동기 문구와 대사 미등록',dialogue:null},
 {id:'admission-arrival',title:'시계탑 광장에 도착',outline:'입학 절차를 통해 시계탑 광장과 아카데미의 생활 공간을 소개한다.',missing:'입학 절차·안내 대사 미등록',dialogue:null},
 {id:'admission-rune',title:'수호 룬의 이상',outline:'시계탑의 수호 룬이 평소와 다르게 어두워져 있음을 짧게 보여준다.',missing:'수호 룬 상태 자원·연출·대사 미등록',dialogue:null},
 {id:'admission-teachers',title:'아카데미의 첫인상',outline:'교직원은 수호 룬의 상태를 살피고 있지만, 원인을 아직 정확히 알지 못한다.',missing:'교직원 대사·상호작용 미등록',dialogue:null},
 {id:'admission-life',title:'아르카디아 생활의 시작',outline:'수업·모험·휴식으로 이루어진 학원생활을 시작한다.',missing:'게임 온보딩 대사 미등록',dialogue:null}
];
