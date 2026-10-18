import test from 'node:test';
import assert from 'node:assert/strict';
import {createMyroomUI} from '../src/ui/myroom.mjs';

function fakeNode(tag,text='',className=''){
 const node={tag,text,className,children:[],attributes:{},dataset:{},style:{setProperty(){}},disabled:false,
  classList:{toggle(){}},
  append(...children){this.children.push(...children);},
  setAttribute(name,value){this.attributes[name]=value;},
  querySelector(selector){return selector==='h1'?this.children.find(child=>child.tag==='h1')??null:null;},
  get childElementCount(){return this.children.length;},
  get textContent(){return [this.text,...this.children.map(child=>child.textContent)].filter(Boolean).join(' ');}
 };
 return node;
}

function renderRoom(review,{phase='ACTING',schedule=['rest','rune-circuit','rest','rest','rest'],week=1,day=2}={}){
 const shell=fakeNode('main');let headingTitle='';
 const run={characterId:'CH01',week,day,phase,schedule,stamina:80,stats:{},forcedRestDays:0,flags:{},actionHistory:[{week:1,day:1,action:'rune-circuit'}]};
 const ui=createMyroomUI({
  el:fakeNode,
  btn(text,action,className){const button=fakeNode('button',text,className);button.onclick=action;return button;},
  img:fakeNode,shell,heading(title){headingTitle=title;shell.children=[];shell.append(fakeNode('h1',title));},current:()=>run,
  characters:[{id:'CH01',name:'카엘',fullbody:'kael0_fullbody.png'}],
  emptyFrame(){},message(){},menu(){},onAdventure(){},onAction(){},onCommit(){},onFinish(){},onEnding(){},onRetry(){},
  isSaveFailed:()=>false,onDiary(){},onBag(){},onAdmission(){},onPet(){},activePet:()=>({name:'베른',image:'PT01_owl.png',modifiers:{}}),meta:()=>({}),decorateRoom(){},
  reviewPrompt:()=>review,onReview(){},onDismissReview(){}
 });
 ui.room();return {shell,ui,run,get headingTitle(){return headingTitle;}};
}

function findAll(node,predicate){return [ ...(predicate(node)?[node]:[]),...node.children.flatMap(child=>findAll(child,predicate)) ];}

test('room offers review of the completed activity and its completed weekday',()=>{
 const {shell:prompt}=renderRoom({week:1,day:1,action:'rune-circuit'});
 const card=findAll(prompt,node=>node.className.includes('room-review-prompt'))[0];
 assert.ok(card);
 assert.match(card.textContent,/1월 2일 화요일 · 룬 회로/);
 assert.ok(findAll(card,node=>node.text==='오늘 돌아보기').length);
 assert.ok(findAll(card,node=>node.text==='나중에').length);
});

test('room does not show a review prompt without a newly completed activity',()=>{
 const {shell:room}=renderRoom(null);
 assert.equal(findAll(room,node=>node.className.includes('room-review-prompt')).length,0);
});

test('profile shows its name and actual stamina bar without visible health numbers or a portrait',()=>{
 const {shell}=renderRoom(null),profile=findAll(shell,node=>node.className.includes('room-profile-card'))[0];
 assert.ok(profile);
 assert.equal(findAll(profile,node=>node.className.includes('mini-profile-face')).length,0);
 assert.match(profile.textContent,/카엘/);
 assert.doesNotMatch(profile.textContent,/체력|80/);
 const bar=findAll(profile,node=>node.tag==='progress')[0];
 assert.ok(bar);
 assert.equal(bar.value,80);
 assert.equal(bar.max,100);
});

test('room date card opens schedule and no separate bottom schedule button is rendered',()=>{
 const state=renderRoom(null),date=findAll(state.shell,node=>node.className.split(' ').includes('room-date'))[0];
 assert.equal(date.tag,'button');
 date.onclick();
 assert.equal(state.headingTitle,'스케줄');
 assert.equal(findAll(state.shell,node=>node.className.includes('room-schedule')).length,0);
});

test('selecting a planned date shows only the activity hint and tapping it again removes its activity',()=>{
 const state=renderRoom(null,{phase:'PLANNING',schedule:['rune-circuit',null,null,null,null]});state.ui.schedule();
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
 const state=renderRoom(null,{phase:'PLANNING',schedule:['rune-circuit',null,null,null,null]});state.ui.schedule();
 findAll(state.shell,node=>node.className.includes('date-cell')&&node.attributes['aria-label']?.startsWith('1월 1일 월요일'))[0].onclick();
 const sameActivity=findAll(state.shell,node=>node.attributes['aria-label']==='룬 회로 활동 선택')[0];
 assert.ok(sameActivity);
 sameActivity.onclick();
 const monday=findAll(state.shell,node=>node.className.includes('date-cell')&&node.attributes['aria-label']?.startsWith('1월 1일 월요일'))[0];
 assert.match(monday.title,/일정 등록/);
});

test('an adjacent-month current-week date stays selected after navigation and receives the chosen activity',()=>{
 const state=renderRoom(null,{phase:'PLANNING',week:9,day:0,schedule:[null,null,null,null,null]});state.ui.schedule();
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
