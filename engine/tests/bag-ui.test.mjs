import test from 'node:test';
import assert from 'node:assert/strict';
import {createJournalUI} from '../src/ui/journal.mjs';
test('pending character conditions are shown without enabling that character early',async()=>{
 const {studentCards}=await import('../src/core/catalogue.mjs');
 const meta={unlockedCharacters:['CH01'],pendingCharacterUnlockIds:['CH03']};
 const card=studentCards(meta).find(character=>character.id==='CH03');
 assert.equal(card.pendingUnlock,true);assert.equal(card.selectable,false);
 const view=setup(meta);view.ui.bag('캐릭터');
 const cards=all(view.shell,item=>item.tag==='button'&&item.className.includes('collection-item-card'));
 cards[2].onclick();assert.match(view.shell.textContent,/조건 달성 완료/);assert.equal(view.modals.length,0);
});

function node(tag,text='',className=''){
 const item={tag,text,className,children:[],attributes:{},dataset:{},style:{},disabled:false,isConnected:true,append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(key,value){this.attributes[key]=value;},get textContent(){return [this.text,...this.children.map(child=>child.textContent)].filter(Boolean).join(' ');}};
 return item;
}
function all(item,predicate){return [...(predicate(item)?[item]:[]),...item.children.flatMap(child=>all(child,predicate))];}
function setup(meta={unlockedCharacters:['CH01','CH02','CH08','CH15','CH16','CH31'],unlockedPetIds:['PET01']},run={actionHistory:[],characterId:'CH01'},options={}){
 const shell=node('main'),modals=[];let headingNode,selectedPetId=null,activePetId='PET01',returnCalls=0;shell.querySelector=selector=>selector==='h1'?headingNode:null;
 const ui=createJournalUI({
  el:node,
  btn(text,action,className=''){const button=node('button',text,className);button.onclick=action;return button;},
  shell,heading(title){headingNode=node('h1',title);shell.replaceChildren(headingNode);},
  current:()=>run,meta:()=>meta,activePet:()=>({id:activePetId}),
  onSelectPet:async id=>{const saved=options.onSelectPet?await options.onSelectPet(id):true;if(saved){selectedPetId=id;activePetId=id;}return saved;},isSaveFailed:()=>false,onReturn(){returnCalls++;},turnPage:(_layout,done)=>done(),
  modal(title,body,actions=[]){const entry={title,body,actions};modals.push(entry);return entry;}
 });
 return {ui,shell,modals,get headingNode(){return headingNode;},get selectedPetId(){return selectedPetId;},get returnCalls(){return returnCalls;}};
}

test('diary close control moves with the book and still returns to the room',()=>{
 const view=setup();view.ui.diary();
 const book=all(view.shell,n=>n.className==='book-layout')[0];
 const close=book.children.find(n=>n.attributes['aria-label']==='마이룸으로 닫기');
 assert.ok(close,'close control must be anchored to the book');
 close.onclick();assert.equal(view.returnCalls,1);
});
test('story diary shows the saved choice text instead of an implementation placeholder',()=>{
 const run={actionHistory:[],dialogueHistory:[{eventId:'MS01',storyId:'MS01',title:'각자의 이유로 아카데미에',week:1,day:0,completionMode:'COMPLETE',selectedChoices:[{choiceNodeId:'C1',choiceId:'A',text:'천천히 둘러보고 싶어.'},{choiceNodeId:'C2',choiceId:'B',text:'친구와 함께하고 싶어.'}],effect:{growth:{}}}]};
 const {ui,shell}=setup(undefined,run);ui.diary();
 all(shell,n=>n.tag==='button'&&n.text==='이야기')[0].onclick();
 assert.match(shell.textContent,/내가 고른 선택/);assert.match(shell.textContent,/천천히 둘러보고 싶어/);assert.match(shell.textContent,/친구와 함께하고 싶어/);assert.doesNotMatch(shell.textContent,/상세 문구 연결 대기/);
});

test('bag opens on badges with the approved tab order and omits item previews',()=>{
 const {ui,shell}=setup();ui.bag();
 const labels=all(shell,n=>n.tag==='button').map(n=>n.text).filter(text=>['아이템','배지','펫','캐릭터','마이룸'].includes(text));
 assert.deepEqual(labels,['배지','펫','캐릭터','마이룸']);
 assert.doesNotMatch(shell.textContent,/아이템/);
});

test('every bag tab anchors its close control inside the frame',()=>{
 const {ui,shell}=setup();
 for(const tab of ['배지','펫','캐릭터','마이룸']){
  ui.bag(tab);
  const frame=all(shell,n=>n.className.includes('bag-frame'))[0];
  assert.ok(frame.children.some(n=>n.className==='close-x'),tab);
  assert.ok(!shell.children.some(n=>n.className==='close-x'),tab);
 }
});

test('bag uses asset-free capsule navigation without a visible title and keeps selected states on tab changes',()=>{
 const {ui,shell}=setup();ui.bag();
 const tabs=()=>all(shell,n=>n.className.includes('bag-tabs'))[0];
 assert.equal(all(shell,n=>n.tag==='h1').length,0);
 assert.equal(tabs().children.length,4);
 assert.ok(tabs().children.every(n=>n.className.includes('bag-tab')&&!n.style.backgroundImage));
 for(let index=0;index<4;index++){
  tabs().children[index].onclick();
  assert.equal(all(shell,n=>n.tag==='h1').length,0);
  assert.deepEqual(tabs().children.map(n=>n.attributes['aria-pressed']),[0,1,2,3].map(i=>String(i===index)));
 }
});

test('character cards keep names off the list and show full information in the right panel',()=>{
 const {ui,shell,modals}=setup();ui.bag('캐릭터');
 const card=all(shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='해금된 캐릭터 정보 보기')[0];
 assert.ok(card);
 assert.doesNotMatch(card.textContent,/카엘/);
 card.onclick();
 assert.equal(modals.length,0);
 const detail=all(shell,n=>n.className==='collection-detail-panel')[0];
 assert.match(detail.textContent,/카엘/);
 assert.ok(all(detail,n=>n.tag==='button'&&n.text==='플레이 중'&&n.disabled).length);
});

test('locked character silhouette opens its real unlock requirement without revealing its name',()=>{
 const {ui,shell,modals}=setup();ui.bag('캐릭터');
 assert.doesNotMatch(shell.textContent,/시온/);
 const card=all(shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='미해금 캐릭터 해금 방법 보기')[0];
 assert.ok(card);
 card.onclick();
 assert.equal(modals.length,0);
 assert.match(shell.textContent,/해금 안내/);
 assert.match(shell.textContent,/궁금한 건 못 참아/);
 assert.match(shell.textContent,/5\/8/);
 assert.doesNotMatch(shell.textContent,/시온/);
});

test('pet silhouettes use the same name-free cards and show the real pet unlock requirement',()=>{
 const {ui,shell,modals}=setup();ui.bag('펫');
 const locked=all(shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='미해금 펫 해금 방법 보기')[0];
 assert.ok(locked);
 locked.onclick();
 assert.equal(modals.length,0);
 assert.match(shell.textContent,/첫 엔딩 열람 완료/);
 assert.doesNotMatch(shell.textContent,/루엔/);
 const unlocked=all(shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='해금된 펫 정보 보기')[0];
 unlocked.onclick();
 assert.equal(modals.length,0);
 assert.match(shell.textContent,/에든/);
});

test('pet selection saves from the right footer and updates the companion without opening a dialog',async()=>{
 const state=setup({unlockedCharacters:['CH01','CH02','CH08','CH15','CH16','CH31'],unlockedPetIds:['PET01','PET02']}),{ui,shell,modals}=state;ui.bag('펫');
 const unlocked=all(shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='해금된 펫 정보 보기')[1];
 unlocked.onclick();
 assert.equal(modals.length,0);
 const footer=all(shell,n=>n.className==='collection-detail-footer')[0];
 const choose=all(footer,n=>n.tag==='button'&&n.text==='함께하기')[0];
 assert.ok(choose);await choose.onclick();
 assert.equal(state.selectedPetId,'PET02');
 assert.ok(all(shell,n=>n.tag==='button'&&n.text==='동행 중'&&n.disabled).length);
});

test('a failed pet save keeps the prior companion and offers another selection attempt',async()=>{
 const view=setup({unlockedCharacters:['CH01'],unlockedPetIds:['PET01','PET02']},undefined,{onSelectPet:async()=>false});
 view.ui.bag('펫');
 all(view.shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='해금된 펫 정보 보기')[1].onclick();
 await all(view.shell,n=>n.tag==='button'&&n.text==='함께하기')[0].onclick();
 assert.equal(view.selectedPetId,null);
 assert.match(view.shell.textContent,/변경하지 못/);
 assert.ok(all(view.shell,n=>n.tag==='button'&&n.text==='함께하기'&&!n.disabled).length);
});

test('pet selection waits for saving and blocks duplicate selections',async()=>{
 let finish,calls=0;
 const view=setup({unlockedCharacters:['CH01'],unlockedPetIds:['PET01','PET02']},undefined,{onSelectPet:()=>{calls++;return new Promise(resolve=>{finish=resolve;});}});
 view.ui.bag('펫');
 all(view.shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='해금된 펫 정보 보기')[1].onclick();
 const choose=all(view.shell,n=>n.tag==='button'&&n.text==='함께하기')[0];
 const saving=choose.onclick();await choose.onclick();
 assert.equal(calls,1);assert.equal(view.selectedPetId,null);
 assert.ok(all(view.shell,n=>n.tag==='button'&&n.text==='저장 중…'&&n.disabled).length);
 finish(true);await saving;
 assert.equal(view.selectedPetId,'PET02');
 assert.ok(all(view.shell,n=>n.tag==='button'&&n.text==='동행 중'&&n.disabled).length);
});

test('viewing another unlocked character does not replace the current run character',()=>{
 const run={characterId:'CH01',actionHistory:[]},view=setup(undefined,run);
 view.ui.bag('캐릭터');
 all(view.shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='해금된 캐릭터 정보 보기')[1].onclick();
 assert.equal(run.characterId,'CH01');
 assert.ok(all(view.shell,n=>n.tag==='button'&&n.text==='새 회차에서 선택'&&n.disabled).length);
});
