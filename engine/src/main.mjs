import {CHARACTERS,createProfile,startRun,setSchedule,actionToken,applyAction,finishWeek,deleteSlot} from './core/state.mjs';
import {createLocalRepository,createBoundaryWriter} from './core/storage.mjs';
import {EngineRuneCircuitScene} from './scenes/EngineRuneCircuitScene.mjs';
const shell=document.querySelector('#shell'),notice=document.querySelector('#notice');
let repository,writer,profile,slotId,pending,saveFailed=false;
try{repository=createLocalRepository(window.localStorage);profile=repository.load();writer=createBoundaryWriter(repository);}
catch(e){notice.textContent='저장 데이터를 읽지 못했습니다. 기존 데이터는 변경하지 않습니다. '+e.message;}
function node(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
function button(text,action,className){const e=node('button',text,className);e.type='button';e.onclick=()=>{try{action();}catch(error){notice.textContent=error.message;}};return e;}
function message(text){notice.textContent=text;}
function save(isRetry=false){
 try{if(isRetry)writer.retry();else writer.save(profile);saveFailed=false;message('개발용 로컬 저장 완료 · 주중 새로고침 시 마지막 저장 시점으로 돌아갑니다.');}
 catch(error){saveFailed=true;message('저장 실패: '+error.message+' · 이 페이지를 닫기 전에 다시 저장해 주세요.');}
}
function heading(title){shell.replaceChildren(node('h1','LUMIA'),node('p','Phaser 3 엔진 개발판 · 계정/AI/스토리 미연결','muted'),node('h2',title));shell.hidden=false;}
function retry(parent){if(saveFailed)parent.append(button('저장 다시 시도',()=>{save(true);renderRoom();}));}
function confirmDelete(id){
 const dialog=node('dialog');dialog.append(node('h2','이 슬롯을 삭제할까요?'),node('p','현재 회차와 슬롯 기록만 삭제합니다. 공용 메타 기록은 유지됩니다.'));
 const actions=node('div',null,'actions');
 actions.append(button('취소',()=>dialog.close(),'quiet'),button('삭제',()=>{deleteSlot(profile,id);save();dialog.close();renderSlots();},'danger'));
 dialog.append(actions);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
}
function renderSlots(){
 heading('나의 아르카디아');
 if(!profile){shell.append(node('p','저장 오류로 진행을 중단했습니다. 원본을 보존한 채 저장 환경을 확인해 주세요.'));return;}
 const empty=profile.slots.find(s=>s.status==='EMPTY');
 const start=button('새로 시작하기',renderEmptySlots);start.disabled=!empty;shell.append(start);
 if(!empty)shell.append(node('p','5개 슬롯이 모두 사용 중입니다. 기존 슬롯을 이어 하거나 삭제해 주세요.'));
 const cards=node('div',null,'cards');
 for(const s of profile.slots){
  const card=node('article',null,'card');card.append(node('h2','슬롯 '+s.slotId));
  card.append(node('p',s.status==='EMPTY'?'저장 기록 없음':s.status==='PLAYING'?s.activeRun.runNumber+'회차 · '+s.activeRun.week+'주차':s.completedRunCount+'회차 완료'));
  if(s.status!=='EMPTY')card.append(button(s.status==='PLAYING'?'이어서 하기':(s.completedRunCount+1)+'회차 시작',()=>{
   slotId=s.slotId;if(s.status==='PLAYING')renderRoom();else renderCharacters(s.slotId);
  }));
  if(s.status!=='EMPTY')card.append(button('슬롯 삭제',()=>confirmDelete(s.slotId),'quiet'));cards.append(card);
 }
 shell.append(cards,node('p','공용 누적 수업 '+profile.meta.counters.classes+'회 · 로컬 개발 저장은 같은 브라우저·주소에서만 유지됩니다.','muted'));
 if(saveFailed)shell.append(button('저장 다시 시도',()=>{save(true);renderSlots();}));
}
function renderEmptySlots(){
 heading('새 회차를 저장할 빈 슬롯을 선택하세요');
 const cards=node('div',null,'cards');
 for(const s of profile.slots.filter(s=>s.status==='EMPTY')){
  const card=node('article',null,'card');card.append(node('h2','슬롯 '+s.slotId),button('이 슬롯에서 시작',()=>renderCharacters(s.slotId)));cards.append(card);
 }
 shell.append(cards,button('뒤로가기',renderSlots,'quiet'));
}
function renderCharacters(id){
 heading('함께할 학생을 선택하세요');const cards=node('div',null,'cards characters');
 for(const c of CHARACTERS){const card=node('article',null,'card'),img=node('img');img.src='./character-assets/'+c.image;img.alt=c.name;
 card.append(img,node('h2',c.name),button('선택',()=>{startRun(profile,id,c.id);slotId=id;save();renderRoom();}));cards.append(card);}
 shell.append(cards,button('슬롯으로',renderSlots,'quiet'));
}
const days=['월','화','수','목','금'],statNames={knowledge:'지식',expression:'표현력',dexterity:'솜씨',exploration:'탐험',magic:'마법'};
function renderRoom(){
 const r=profile.slots[slotId-1].activeRun,c=CHARACTERS.find(c=>c.id===r.characterId);
 heading('마이룸 · '+r.week+' / 52주');const img=node('img',null,'portrait');img.src='./character-assets/'+c.image;img.alt=c.name;shell.append(img,node('p',c.name+' · '+r.runNumber+'회차'));
 const stats=node('div',null,'stats');stats.append(node('span','체력 '+r.stamina+' / 100'));for(const[k,v]of Object.entries(r.stats))stats.append(node('span',statNames[k]+' '+v));shell.append(stats);
 shell.append(node('p','이번 골격은 룬 회로 수업과 휴식을 연결합니다. 모험·메인 스토리·엔딩은 후속 구현입니다.','muted'));
 if(saveFailed){
  shell.append(node('p','저장 실패로 다음 행동을 잠시 중단했습니다. 아래에서 저장을 다시 시도해 주세요.'));
 }else if(r.phase==='PLANNING'){
  const schedule=node('div',null,'schedule'),selects=[];
  for(const day of days){const label=node('label',day+'요일'),select=node('select');select.setAttribute('aria-label',day+'요일 일정');
   for(const[value,text]of [['class','마법 수업 · 룬 회로'],['rest','휴식']]){const option=node('option',text);option.value=value;select.append(option);}
   label.append(select);schedule.append(label);selects.push(select);}
  shell.append(schedule,button('이번 주 일정 시작',()=>{setSchedule(profile,slotId,selects.map(s=>s.value));renderRoom();}));
 }else if(r.phase==='ACTING'){
  const action=r.exhausted?'rest':r.schedule[r.day];shell.append(node('h2',days[r.day]+'요일 · '+(action==='class'?'마법 수업':'휴식')));
  if(r.exhausted)shell.append(node('p','과로 상태: 체력 70 이상까지 예정 수업을 휴식으로 대체합니다.'));
  shell.append(button(action==='class'?'룬 회로 시작':'휴식하기',()=>{
   const token=actionToken(r);
   if(action==='rest'){applyAction(profile,slotId,token);renderRoom();message('휴식으로 체력을 회복했습니다.');}
   else{pending={slotId,token};shell.hidden=true;game.scene.start('rune-circuit',{difficulty:1,seed:'run-'+r.runNumber+'-week-'+r.week+'-day-'+r.day,maxDurationMs:180000});}
  }));
 }else if(r.phase==='WEEK_COMPLETE'){
  shell.append(node('h2','평일 일정을 마쳤습니다.'),button('주말 보내기 · 자동 저장',()=>{finishWeek(profile,slotId);save();renderRoom();}));
 }else shell.append(node('h2','52주 완료 · 엔딩 연결 대기'),node('p','엔딩 조건과 이야기를 임의로 만들지 않습니다. 후속 엔딩 구현 전까지 이 회차를 보존합니다.'));
 const actions=node('div',null,'actions'),back=button('슬롯으로 돌아가기',renderSlots,'quiet');
 back.disabled=saveFailed||['ACTING','WEEK_COMPLETE'].includes(r.phase);
 actions.append(back);retry(actions);shell.append(actions);
 if(back.disabled&&!saveFailed)shell.append(node('p','다른 슬롯으로 이동하려면 이번 주 일정과 주말 저장을 먼저 마쳐 주세요.','muted'));
 shell.append(node('p','개발 시험값: 수업 체력 -10, 휴식 +25, 주말 +10, 성공 시 마법 +3. 최종 밸런스가 아닙니다.','muted'));
}
class HomeScene extends Phaser.Scene{
 constructor(){super('home');}
 preload(){this.load.image('myroom','./world-assets/BG10_myroom1_day_1920x1080_012.png');this.load.image('space-workshop','./world-assets/BG08_magic_workshop_1920x1080_018.png');}
 create(){this.add.image(640,360,'myroom').setDisplaySize(1280,720);}
}
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1280,height:720,backgroundColor:'#142a37',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[HomeScene,EngineRuneCircuitScene]});
function receive(result){
 if(!pending)return;const current=pending;pending=null;
 try{const applied=applyAction(profile,current.slotId,current.token,result);slotId=current.slotId;renderRoom();message(applied?'수업 결과를 반영했습니다. 다음 일정으로 진행하세요.':'수업을 나왔습니다. 오늘 일정은 그대로 유지합니다.');}
 catch(error){shell.hidden=false;message(error.message);}
}
game.events.on('minigame:complete',receive);game.events.on('minigame:quit',receive);
renderSlots();
window.addEventListener('beforeunload',event=>{const unsaved=profile?.slots.some(s=>s.activeRun&&s.activeRun.phase!=='PLANNING'&&s.activeRun.phase!=='AWAITING_ENDING');if(saveFailed||unsaved){event.preventDefault();event.returnValue='';}});
