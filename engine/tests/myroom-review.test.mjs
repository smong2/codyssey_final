import test from 'node:test';
import assert from 'node:assert/strict';
import {createMyroomUI} from '../src/ui/myroom.mjs';

function fakeNode(tag,text='',className=''){
 const node={tag,text,className,children:[],attributes:{},dataset:{},events:{},style:{values:{},setProperty(key,value){this.values[key]=value;}},disabled:false,
  classList:{toggle(){},add(){}},
  addEventListener(name,handler){this.events[name]=handler;},
  getBoundingClientRect(){return this.className==='room-actors'?{left:0,top:0,width:1000,height:600}:{left:200,top:200,width:100,height:200};},
  querySelectorAll(selector){return selector==='img'?this.children.filter(child=>child.tag==='pet'||child.tag==='img'):[];},
  append(...children){this.children.push(...children);},
  replaceChildren(...children){this.children=children;},
  setAttribute(name,value){this.attributes[name]=value;},
  querySelector(selector){return selector==='h1'?this.children.find(child=>child.tag==='h1')??null:null;},
  get childElementCount(){return this.children.length;},
  set textContent(value){this.text=String(value);this.children=[];},
  get textContent(){return [this.text,...this.children.map(child=>child.textContent)].filter(Boolean).join(' ');}
 };
 return node;
}

function renderRoom({phase='ACTING',schedule=['rest','rune-circuit','rest','rest','rest'],week=1,day=2,petDialogues}={}){
 const shell=fakeNode('main');let headingTitle='';
 const run={characterId:'CH01',week,day,phase,schedule,stamina:80,stats:{},forcedRestDays:0,flags:{},actionHistory:[{week:1,day:1,action:'rune-circuit'}]};
 const ui=createMyroomUI({
  el:fakeNode,
  btn(text,action,className){const button=fakeNode('button',text,className);button.onclick=action;return button;},
  img:fakeNode,shell,heading(title){headingTitle=title;shell.children=[];shell.append(fakeNode('h1',title));},current:()=>run,
  characters:[{id:'CH01',name:'카엘',fullbody:'kael0_fullbody.png'}],
  emptyFrame(){},message(){},menu(){},onAdventure(){},onAction(){},onCommit(){},onFinish(){},onEnding(){},onRetry(){},
  isSaveFailed:()=>false,onDiary(){},onBag(){},onAdmission(){},onPet(){},petDialogues,activePet:()=>({name:'베른',image:'PT01_owl.png',modifiers:{}}),meta:()=>({}),decorateRoom(){}
 });
 ui.room();return {shell,ui,run,get headingTitle(){return headingTitle;}};
}

function findAll(node,predicate){return [ ...(predicate(node)?[node]:[]),...node.children.flatMap(child=>findAll(child,predicate)) ];}

test('profile close control stays outside the scrollable information body',()=>{
 const {ui,shell}=renderRoom();ui.profile();
 const frame=findAll(shell,n=>n.className==='paper profile-info')[0];
 assert.ok(frame.children.some(n=>n.className==='close-x'));
 const body=frame.children.find(n=>n.className==='profile-info-body');
 assert.ok(body,'profile needs a separate scrolling body');
 assert.ok(!findAll(body,n=>n.className==='close-x').length);
 assert.match(body.textContent,/카엘/);
 assert.ok(!shell.children.some(n=>n.className==='close-x'));
});

test('compact profile combines real stats in one frame without duplicate screen headings',()=>{
 const {ui,shell,run}=renderRoom();
 run.stats={knowledge:55,expression:53,dexterity:51,exploration:82,magic:50};ui.profile();
 const identity=findAll(shell,n=>n.className==='profile-identity')[0];
 assert.ok(identity);assert.match(identity.textContent,/카엘/);
 assert.equal(findAll(identity,n=>n.tag==='progress')[0].value,80);
 const cards=findAll(shell,n=>n.className==='profile-stat');
 assert.equal(cards.length,5);
 assert.deepEqual(cards.map(n=>findAll(n,n=>n.tag==='progress')[0].value),[55,53,51,82,50]);
 const stats=findAll(shell,n=>n.className==='paper profile-stats')[0];
 assert.ok(cards.every(card=>stats.children.includes(card)));
 assert.equal(findAll(stats,n=>n!==stats&&n.className.split(' ').includes('paper')).length,0);
 assert.equal(findAll(shell,n=>['h1','h2'].includes(n.tag)&&['프로필','캐릭터 정보'].includes(n.text)).length,0);
 assert.doesNotMatch(shell.textContent,/나이|생일|관계: 데이터 미등록/);
 assert.equal(findAll(stats,n=>n.tag==='img').length,0);
 assert.equal(findAll(shell,n=>n.className==='profile-character').length,1);
});

test('room omits the retired today-review actions after a completed activity',()=>{
 const {shell}=renderRoom();
 assert.equal(findAll(shell,node=>node.text==='오늘 돌아보기'||node.text==='나중에').length,0);
 assert.equal(findAll(shell,node=>node.className.includes('room-review-prompt')).length,0);
});

test('room status shows actual stamina with the fill asset and matching numeric label',()=>{
 const {shell}=renderRoom(),profile=findAll(shell,node=>node.className.includes('room-profile-card'))[0];
 assert.ok(profile);
 assert.equal(findAll(profile,node=>node.className.includes('mini-profile-face')).length,0);
 assert.match(profile.textContent,/카엘/);
 assert.doesNotMatch(profile.textContent,/체력/);
 assert.match(profile.textContent,/80 \/ 100/);
 const fill=findAll(profile,node=>node.className==='mini-profile-stamina-art')[0];
 assert.ok(fill);assert.equal(fill.src,'./design-assets/ui/UI21_myroom_profile_frame_green_bar.png');
 assert.equal(fill.style.clipPath,'inset(0 32% 0 0)');
 const bar=findAll(profile,node=>node.tag==='progress')[0];
 assert.ok(bar);
 assert.equal(bar.value,80);
 assert.equal(bar.max,100);
});

test('room stamina artwork respects empty, partial and full health without changing state',()=>{
 const {ui,shell,run}=renderRoom();
 for(const [value,clip] of [[0,'inset(0 80% 0 0)'],[50,'inset(0 50% 0 0)'],[100,'inset(0 20% 0 0)']]){
  run.stamina=value;ui.room();
  const fill=findAll(shell,node=>node.className==='mini-profile-stamina-art')[0];
  assert.equal(fill.style.clipPath,clip);assert.equal(run.stamina,value);
 }
});

test('room date card opens schedule and no separate bottom schedule button is rendered',()=>{
 const state=renderRoom(),date=findAll(state.shell,node=>node.className.split(' ').includes('room-date'))[0];
 assert.equal(date.tag,'button');
 date.onclick();
 assert.equal(state.headingTitle,'스케줄');
 assert.equal(findAll(state.shell,node=>node.className.includes('room-schedule')).length,0);
});
test('schedule calls its class category 수업',()=>{
 const {ui,shell}=renderRoom({phase:'PLANNING'});ui.schedule();
 assert.ok(findAll(shell,node=>node.tag==='button'&&node.text==='수업').length>0);
 assert.equal(findAll(shell,node=>node.tag==='button'&&node.text==='교육').length,0);
});

test('pet sleeps until dialogues are ready, then greets before the first click',async()=>{
 let finishLoading;
 const loading=new Promise(resolve=>{finishLoading=resolve;});
 const {shell}=renderRoom({petDialogues:()=>loading});
 const pet=findAll(shell,node=>node.className==='room-pet')[0];
 const bubble=findAll(pet,node=>node.className.includes('room-pet-bubble'))[0];
 assert.equal(bubble.textContent,'zzz');
 assert.equal(bubble.attributes['aria-live'],'polite');
 assert.equal(pet.attributes['aria-disabled'],'true');
 pet.onclick();assert.equal(bubble.textContent,'zzz');
 finishLoading(['오늘도 같이 책을 읽자.']);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(bubble.textContent,'안녕?');
 assert.equal(pet.attributes['aria-disabled'],'false');
 pet.onclick();
 assert.equal(bubble.textContent,'오늘도 같이 책을 읽자.');
 assert.doesNotMatch(pet.textContent,/펫 변경/);
});

test('mouse dragging the pet suppresses native image dragging and updates its room position',()=>{
 const {shell}=renderRoom(),pet=findAll(shell,node=>node.className==='room-pet')[0];let prevented=false;
 pet.events.pointerdown({button:0,pointerId:1,clientX:250,clientY:300,preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(pet.querySelectorAll('img')[0].draggable,false);
 pet.events.pointermove({pointerId:1,clientX:350,clientY:360});
 assert.equal(pet.style.values['--room-x'],'35%');assert.equal(pet.style.values['--room-y'],'60%');
 pet.events.pointerup({pointerId:1});assert.equal(pet.dataset.dragged,'true');
});

test('weekly review separates growth from activities and omits empty forced-rest details',()=>{
 const {ui,shell,run}=renderRoom();run.pendingWeekSummaryWeek=1;
 run.lastWeekSummary={week:1,statDelta:{knowledge:1,expression:0,skill:0,exploration:0,magic:0},classCount:1,staminaSpent:10,staminaRecovered:0,startingStamina:100,endingStamina:90,forcedRestDays:0};
 run.actionHistory=[{week:1,day:0,action:'rune-circuit',status:'COMPLETED',effect:{}}];ui.weeklySummary();
 const columns=findAll(shell,n=>n.className==='weekly-summary-columns')[0];assert.equal(columns.children.length,2);
 assert.match(columns.children[0].textContent,/성장 스탯 변화/);assert.doesNotMatch(columns.children[0].textContent,/수업 진행/);
 assert.match(columns.children[1].textContent,/룬 회로 · 1회/);assert.match(columns.children[1].textContent,/100 → 90/);assert.doesNotMatch(shell.textContent,/강제 휴식|서버 주간 요약에 포함/);
});

test('calendar image arrows preserve accessible month navigation in both directions',()=>{
 const {ui,shell}=renderRoom({phase:'PLANNING'});ui.schedule();
 const control=label=>findAll(shell,n=>n.attributes['aria-label']===label)[0];
 for(const label of ['이전 달','다음 달']){
  const arrow=control(label);assert.ok(arrow);
  assert.equal(arrow.children[0].src,'./design-assets/ui/UI23_journal_arrow_right.png');
  assert.equal(arrow.children[0].attributes['aria-hidden'],'true');
 }
 control('다음 달').onclick();
 assert.ok(findAll(shell,n=>n.tag==='h2'&&n.text.endsWith('2월')).length);
 control('이전 달').onclick();
 assert.ok(findAll(shell,n=>n.tag==='h2'&&n.text.endsWith('1월')).length);
});

test('selecting a planned date shows only the activity hint and tapping it again removes its activity',()=>{
 const state=renderRoom({phase:'PLANNING',schedule:['rune-circuit',null,null,null,null]});state.ui.schedule();
 const monday=()=>findAll(state.shell,node=>node.className.includes('date-cell')&&node.attributes['aria-label']?.startsWith('1월 1일 월요일'))[0];
 monday().onclick();
 assert.equal(findAll(state.shell,node=>node.className.includes('schedule-date-detail')).length,0);
 const hint=findAll(state.shell,node=>node.className.includes('schedule-date-hint'))[0];
 assert.match(hint.textContent,/월요일 선택/);
 assert.match(hint.textContent,/변경/);
 assert.match(hint.textContent,/삭제/);
 const footer=findAll(state.shell,node=>node.className==='schedule-footer')[0];
 assert.ok(footer.children.includes(hint));
 const frame=findAll(state.shell,node=>node.className.includes('schedule-frame'))[0];
 assert.ok(frame.children.includes(footer));
 assert.equal(findAll(state.shell,node=>node.text==='닫기'||node.text==='활동 삭제').length,0);
 monday().onclick();
 assert.match(monday().title,/일정 등록/);
});

test('choosing the same activity for its selected date removes it instead of reassigning it',()=>{
 const state=renderRoom({phase:'PLANNING',schedule:['rune-circuit',null,null,null,null]});state.ui.schedule();
 findAll(state.shell,node=>node.className.includes('date-cell')&&node.attributes['aria-label']?.startsWith('1월 1일 월요일'))[0].onclick();
 const sameActivity=findAll(state.shell,node=>node.attributes['aria-label']==='룬 회로 활동 선택')[0];
 assert.ok(sameActivity);
 sameActivity.onclick();
 const monday=findAll(state.shell,node=>node.className.includes('date-cell')&&node.attributes['aria-label']?.startsWith('1월 1일 월요일'))[0];
 assert.match(monday.title,/일정 등록/);
});

test('an adjacent-month current-week date stays selected after navigation and receives the chosen activity',()=>{
 const state=renderRoom({phase:'PLANNING',week:9,day:0,schedule:[null,null,null,null,null]});state.ui.schedule();
 const date=(month,day)=>findAll(state.shell,node=>node.className.includes('date-cell')&&node.attributes['aria-label']?.startsWith(month+'월 '+day+'일 '))[0];
 assert.equal(findAll(state.shell,node=>node.attributes['aria-pressed']==='true'&&node.className.includes('date-cell')).length,0);
 date(3,1).onclick();
 assert.ok(findAll(state.shell,node=>node.tag==='h2'&&node.text.endsWith('3월')).length);
 assert.equal(date(3,1).attributes['aria-pressed'],'true');
 assert.equal(findAll(state.shell,node=>node.attributes['aria-pressed']==='true'&&node.className.includes('date-cell')).length,1);
 findAll(state.shell,node=>node.attributes['aria-label']==='룬 회로 활동 선택')[0].onclick();
 assert.equal(date(3,1).title,'룬 회로');
 assert.equal(date(3,4).title,'주말 · 자동 경과');
 date(2,28).onclick();
 assert.ok(findAll(state.shell,node=>node.tag==='h2'&&node.text.endsWith('2월')).length);
 assert.equal(date(2,28).attributes['aria-pressed'],'true');
});
