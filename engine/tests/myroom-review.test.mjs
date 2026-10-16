import test from 'node:test';
import assert from 'node:assert/strict';
import {createMyroomUI} from '../src/ui/myroom.mjs';

function fakeNode(tag,text='',className=''){
 const node={tag,text,className,children:[],attributes:{},dataset:{},style:{setProperty(){}},disabled:false,
  append(...children){this.children.push(...children);},
  setAttribute(name,value){this.attributes[name]=value;},
  get childElementCount(){return this.children.length;},
  get textContent(){return [this.text,...this.children.map(child=>child.textContent)].filter(Boolean).join(' ');}
 };
 return node;
}

function renderRoom(review){
 const shell=fakeNode('main');
 const run={characterId:'CH01',week:1,day:2,phase:'ACTING',schedule:['rest','rune-circuit','rest','rest','rest'],stamina:80,stats:{},forcedRestDays:0,flags:{},actionHistory:[{week:1,day:1,action:'rune-circuit'}]};
 const ui=createMyroomUI({
  el:fakeNode,
  btn(text,action,className){const button=fakeNode('button',text,className);button.onclick=action;return button;},
  img:fakeNode,shell,heading(){shell.children=[];},current:()=>run,
  characters:[{id:'CH01',name:'카엘',image:'CH01_1_base.png'}],
  emptyFrame(){},message(){},menu(){},onAdventure(){},onAction(){},onCommit(){},onFinish(){},onEnding(){},onRetry(){},
  isSaveFailed:()=>false,onDiary(){},onBag(){},onAdmission(){},onPet(){},activePet:()=>({name:'베른',image:'owl1.png',modifiers:{}}),meta:()=>({}),decorateRoom(){},
  reviewPrompt:()=>review,onReview(){},onDismissReview(){}
 });
 ui.room();return shell;
}

function findAll(node,predicate){return [ ...(predicate(node)?[node]:[]),...node.children.flatMap(child=>findAll(child,predicate)) ];}

test('room offers review of the completed activity and its completed weekday',()=>{
 const prompt=renderRoom({week:1,day:1,action:'rune-circuit'});
 const card=findAll(prompt,node=>node.className.includes('room-review-prompt'))[0];
 assert.ok(card);
 assert.match(card.textContent,/1월 2일 화요일 · 룬 회로/);
 assert.ok(findAll(card,node=>node.text==='오늘 돌아보기').length);
 assert.ok(findAll(card,node=>node.text==='나중에').length);
});

test('room does not show a review prompt without a newly completed activity',()=>{
 const room=renderRoom(null);
 assert.equal(findAll(room,node=>node.className.includes('room-review-prompt')).length,0);
});
