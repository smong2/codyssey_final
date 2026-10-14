import {calendarModel,calendarActivity,scheduleSession,scheduleReady,assignScheduleDay} from '../core/preview.mjs';
import {CLASSES,classOf} from '../core/classes.mjs';
import {activityArt} from './journal.mjs';
import {studentCards} from '../core/catalogue.mjs';
import {appendCharacterInfo} from './character-info.mjs';
import {effectiveStats} from '../core/pets.mjs';
import {currentAction,forcedRestRemaining,isForcedRestDay,lowStamina} from '../core/activity-rules.mjs';
const WEEKDAYS=['일','월','화','수','목','금','토'];
const STAT_NAMES={knowledge:'지식',expression:'표현력',dexterity:'솜씨',exploration:'탐험',magic:'마법'};
const activityTitle=a=>a==='adventure'?'유리 온실 모험':classOf(a)?.title??'휴식';
export const DESCRIPTIONS={CH01:'그림자 도서관의 전략가. 치밀하지만 감정 표현에 서툼',CH02:'별을 읽는 은둔 사제. 깊은 통찰과 느린 신뢰',CH08:'시공간 실험가. 실패를 새 시도로 바꾸는 모험가',CH15:'바람을 쫓는 자유 유랑자. 빠른 친화력',CH16:'빛의 요정 소환사. 분위기를 밝히는 인물',CH31:'무대 위의 환상 마술사. 유쾌한 쇼맨'};
export function createMyroomUI(ctx){
 const {el,btn,img,shell,heading,current,characters,emptyFrame,message,menu,onAdventure,onAction,onCommit,onFinish,onEnding,onRetry,isSaveFailed,onDiary,onBag,onAdmission}=ctx;
 let draftSession=null,draft=[],selected=null,monthOffset=0,category='교육';
 const portrait=(c,cls)=>{const i=el('img',null,cls);i.src='./character-assets/'+c.image.replace(/1_base\.png$/,'0_fullbody.png');i.alt=c.name;return i;};
 const character=()=>characters.find(c=>c.id===current().characterId);
 const close=()=>{const x=btn('X',room,'close-x');x.setAttribute('aria-label','마이룸으로 닫기');shell.append(x);};
 function prepareDraft(){const next=scheduleSession(draftSession,current());if(next!==draftSession){draftSession=next;draft=next.draft;selected=null;monthOffset=0;category='교육';}}
 function profile(){
  const r=current(),c=character();heading('프로필','profile-page');
  const layout=el('div',null,'profile-layout'),stats=el('section',null,'paper profile-stats');stats.append(shell.querySelector('h1'),el('h2',c.name),el('p','체력 '+r.stamina+' / 100'));
  const stamina=el('progress');stamina.max=100;stamina.value=r.stamina;stamina.setAttribute('aria-label','체력');stats.append(stamina);
  const pet=ctx.activePet(),effective=effectiveStats(r.stats,pet,r.stamina);
  if(forcedRestRemaining(r))stats.append(el('p','강제 휴식 · 평일 '+forcedRestRemaining(r)+'일 후 체력 100 회복'));
  else if(lowStamina(r.stamina))stats.append(el('p','저체력 · 유효 스탯 70% / 성장량 50%'));
  for(const[k,v]of Object.entries(effective)){const row=el('div',null,'profile-stat');row.append(el('span',STAT_NAMES[k]),el('strong',String(v)+(pet.modifiers[k]?' (펫 +'+pet.modifiers[k]+')':'')));const bar=el('progress');bar.max=500;bar.value=v;bar.setAttribute('aria-label',STAT_NAMES[k]);row.append(bar);stats.append(row);}
  const info=el('section',null,'paper profile-info');info.append(el('h2','캐릭터 정보'));appendCharacterInfo(info,studentCards(ctx.meta(),'bag').find(s=>s.id===c.id)??c,el);info.append(el('p',r.runNumber+'회차 · '+r.week+'주차'),el('p','나이 · 생일 · 관계: 데이터 미등록'),el('h3','최근 이야기'),el('p','시나리오 데이터 연결 예정'),el('h3','함께하는 펫'),el('p',pet.name),el('p',pet.description));
  layout.append(stats,portrait(c,'profile-character'),info);shell.append(layout);close();
 }
 function collection(tab='카테고리 보상'){
  heading('컬렉션','collection-page');const tabs=el('nav',null,'actions');for(const t of ['카테고리 보상','캐릭터','펫','마이룸 퍼즐']){const b=btn(t,()=>collection(t),t===tab?'selected':'quiet');b.setAttribute('aria-pressed',String(t===tab));tabs.append(b);}shell.append(tabs);
  const panel=el('section',null,'paper collection-panel');panel.append(el('h2',tab));
  if(tab==='캐릭터'){panel.append(el('p','현재 연결된 캐릭터 자원 · 실제 해금 조건은 미연결'));const grid=el('div',null,'collection-characters');for(const c of characters){const card=el('article',null,'card');card.append(portrait(c,'collection-portrait'),el('h3',c.name),el('p',c.id===current().characterId?'현재 학생':ctx.meta().unlockedCharacters.includes(c.id)?'시안에서 선택 가능':'잠김'));grid.append(card);}panel.append(grid);}
  else if(tab==='펫'){panel.append(img('bern','owl1.png','베른 부엉이','collection-pet'),el('h3','베른 · 부엉이'),el('p','현재 선택된 펫 · 우선 부엉이로 고정'),btn('선택됨',()=>message('현재 펫은 부엉이로 고정되어 있습니다.')));panel.append(el('p','다른 펫의 해금 조건·선택 데이터는 연결 예정입니다. 베른과 펫은 동일한 선택 기능으로 취급합니다.'));}
  else panel.append(el('div','◇','empty-symbol'),el('p',tab==='마이룸 퍼즐'?'퍼즐 조각 · 완성도 · 배경 선택 프레임':'카테고리 완성도 · 캐릭터/펫/배경 보상 프레임'),el('p','진행도와 해금 조건 데이터 미등록 · 임의 보상 없음'),el('small','카테고리 보상 외 개별 해금 조건도 연결 예정'));
  shell.append(panel,btn('마이룸으로',room,'screen-back'));
 }
 function schedule(){
  prepareDraft();const r=current();heading('스케줄','schedule-page');const titleFrame=el('header',null,'paper schedule-title-frame');titleFrame.append(shell.querySelector('h1'),el('p','활동 카드를 선택한 뒤, 이번 주 원하는 요일 칸을 누르세요. 토·일은 일정 없이 지나갑니다.','schedule-instruction'));shell.append(titleFrame);
  const layout=el('div',null,'schedule-layout'),m=calendarModel(r,monthOffset),calendar=el('section',null,'paper calendar'),top=el('div',null,'calendar-heading');
  top.append(btn('이전 달',()=>{monthOffset--;schedule();},'month-button'),el('h2','아르카디아력 '+m.arcadiaYear+'년 · '+m.month+'월'),btn('다음 달',()=>{monthOffset++;schedule();},'month-button'));calendar.append(top);
  const grid=el('div',null,'calendar-grid');grid.style.gridTemplateRows='auto repeat('+Math.ceil(m.cells.length/7)+',minmax(0,1fr))';grid.setAttribute('aria-label','일요일 시작 월간 달력');WEEKDAYS.forEach(d=>grid.append(el('div',d,'weekday')));
  for(const cell of m.cells){if(!cell){grid.append(el('div',null,'date-empty'));continue;}const activity=calendarActivity(r,cell,draft),forced=cell.inWeek&&!cell.weekend&&isForcedRestDay(r,cell.actionIndex);
   const label=cell.weekend?'주말 · 자동 경과':forced?'강제 휴식':activity?activityTitle(activity):'일정 등록';
   const box=btn('',()=>{if(cell.outsideMonth){monthOffset+=(cell.year-m.year)*12+cell.month-m.month;schedule();return;}if(forced)return;if(r.phase==='PLANNING'&&cell.inWeek&&!cell.weekend&&draft[cell.actionIndex]&&(!selected||draft[cell.actionIndex]===selected)){draft[cell.actionIndex]=null;schedule();return;}if(!selected){message('오른쪽에서 활동 카드를 먼저 선택해 주세요.');return;}if(assignScheduleDay(r,draft,cell,selected))schedule();},'date-cell');
   box.setAttribute('aria-label',cell.month+'월 '+cell.day+'일 '+WEEKDAYS[cell.weekday]+'요일'+(cell.inWeek||activity||cell.pastWeekend?' · '+label:''));box.title=label;box.classList.toggle('outside-month',cell.outsideMonth);box.classList.toggle('past-activity',!!(cell.pastAction||cell.pastWeekend));
   if(cell.outsideMonth){box.title=cell.month+'월 달력으로 이동';box.setAttribute('aria-label',cell.month+'월 '+cell.day+'일 · '+box.title);}
   box.disabled=!cell.outsideMonth&&(!cell.inWeek||cell.weekend||forced||r.phase!=='PLANNING'||isSaveFailed());box.classList.toggle('weekend',cell.weekend);box.classList.toggle('current-week',cell.inWeek);box.append(el('span',String(cell.day),'date-number'));if(activity||cell.weekend&&(cell.inWeek||cell.pastWeekend)){const art=activityArt(cell.weekend?'rest':activity);if(art){const image=el('img',null,'calendar-activity-image');image.src=art;image.alt='';image.onerror=()=>{image.remove();box.append(el('small',label));};box.append(image);}else box.append(el('small',label));}else if(cell.inWeek&&!cell.outsideMonth)box.append(el('small','＋','date-add'));grid.append(box);
  }calendar.append(grid,btn('현재 달',()=>{monthOffset=0;schedule();},'text-button'));
  const activities=el('section',null,'paper activity-panel');activities.append(el('h2','활동 카드'));const tabs=el('nav',null,'activity-tabs');for(const t of ['교육','모험','휴식']){const b=btn(t,()=>{category=t;schedule();},category===t?'selected':'quiet');b.setAttribute('aria-pressed',String(category===t));tabs.append(b);}activities.append(tabs);
  const cards=el('div',null,'activity-cards');const list=category==='교육'?CLASSES:category==='휴식'?[{id:'rest',title:'휴식'}]:[{id:'adventure',title:'유리 온실 모험'}];
  for(const a of list){const b=btn('',()=>{selected=a.id;schedule();},'activity-card'+(selected===a.id?' selected':''));b.setAttribute('aria-label',a.title+' 활동 선택');b.setAttribute('aria-pressed',String(selected===a.id));b.disabled=r.phase!=='PLANNING'||isSaveFailed();const picture=el('span',null,'activity-image-slot'),art=activityArt(a.id);if(art){const image=el('img');image.src=art;image.alt='';image.onerror=()=>{image.remove();picture.textContent='◇';};picture.append(image);}else picture.textContent='◇';b.append(picture,el('strong',a.title),el('small',a.id==='rest'?'체력 +40 / +50 / +70':a.id==='adventure'?'체력 -15 · SD 이동':(STAT_NAMES[a.stat]??'교육')+' · 체력 -10'));cards.append(b);}activities.append(cards,el('p',selected?'선택한 활동: '+activityTitle(selected):'활동을 먼저 선택하세요.','chosen-activity'));
  const footer=el('div',null,'schedule-footer');if(r.phase==='PLANNING'){const start=btn('이번 주 일정 시작',()=>{onCommit([...draft]);room();});start.disabled=!scheduleReady(draft)||isSaveFailed();footer.append(el('p',draft.filter(Boolean).length+' / 5일 등록'),start);}else footer.append(el('p','진행 중인 일정은 변경할 수 없습니다.'));
  layout.append(calendar,activities);shell.append(layout,footer);close();
 }
 function room(){
  const r=current(),c=character(),m=calendarModel(r);heading('마이룸','room-page');ctx.decorateRoom?.();
  const date=el('section',null,'room-date paper');date.setAttribute('aria-label','현재 날짜');date.append(el('small','아르카디아력 '+m.arcadiaYear+'년'),el('strong',m.month+'월 '+m.day+'일 · '+WEEKDAYS[m.weekday]),el('small',m.season+' · '+r.week+' / 52주'));
  const tools=el('nav',null,'room-iconbar');tools.setAttribute('aria-label','마이룸 기능');
  for(const [label,symbol,action,file] of [['다이어리','▤',onDiary,'UI09_discovery_journal_006.svg'],['가방','♧',onBag,'UI08_bag_005.svg'],['메뉴','☰',menu]]){const b=btn('',action,'room-icon');b.setAttribute('aria-label',label);b.append(file?img('ui',file,'','tool-icon'):el('span',symbol,'icon-symbol'),el('small',label));tools.append(b);}
  const actors=el('div',null,'room-actors'),actor=portrait(c,'room-main-character');actor.dataset.character=c.id;const adjustment={CH01:[1.13,3],CH15:[1.09,2],CH31:[1.07,2]}[c.id]??[1,0];actor.style.setProperty('--actor-scale',adjustment[0]);actor.style.setProperty('--actor-drop',adjustment[1]+'vh');actors.append(actor);actors.dataset.character=c.id;const chosenPet=ctx.activePet(),pet=btn('',ctx.onPet,'room-pet');pet.setAttribute('aria-label',chosenPet.name+' 펫 선택');pet.append(img('bern',chosenPet.image,chosenPet.name,'room-bern'),el('span',chosenPet.name));actors.append(pet);
  const bottom=el('nav',null,'room-bottom');bottom.append(btn('스케줄',schedule,'room-schedule'));
  const action=el('section',null,'room-current-action paper');
  if(isSaveFailed())action.append(el('p','저장 실패 · 다음 행동 중단'),btn('저장 다시 시도',()=>{onRetry();room();}));
  else if(r.flags?.admissionPending)action.append(el('span','입학 초대장'),btn('입학 이야기 보기',onAdmission));
  else if(r.phase==='ACTING'){const a=currentAction(r),lesson=classOf(a),restDays=forcedRestRemaining(r);action.append(el('span',WEEKDAYS[r.day+1]+'요일 · '+(restDays?'강제 휴식 · '+restDays+'일 남음':activityTitle(a))),btn(a==='adventure'?'모험 시작':lesson?'수업 시작':restDays?'하루 쉬기':'휴식하기',onAction));}
  else if(r.phase==='WEEK_COMPLETE')action.append(el('span','평일 일정 완료'),btn('주말 보내기 · 자동 저장',onFinish));
  else if(r.phase==='AWAITING_ENDING')action.append(el('span','52주 육성 완료 · 마지막 1일'),btn('최종 이벤트·엔딩 프레임',onEnding));
  const dateStack=el('div',null,'room-date-stack');const profileUI=btn('',profile,'room-profile-card');profileUI.setAttribute('aria-label',c.name+' 프로필');profileUI.append(img('ui','player_status_frame_015.png','','mini-profile-frame'));const face=el('span',null,'mini-profile-face'),faceImage=el('img');faceImage.src='./character-assets/'+c.image;faceImage.alt='';face.append(faceImage);const profileCopy=el('span',null,'mini-profile-copy');profileCopy.append(el('strong',c.name),el('small','체력 '+r.stamina+' / 100'));profileUI.append(face,profileCopy);dateStack.append(profileUI,date);if(action.childElementCount)dateStack.append(action);shell.append(dateStack,tools,actors,bottom);
 }
 return {room,profile,schedule,collection};
}
