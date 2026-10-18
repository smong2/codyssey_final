import test from 'node:test';
import assert from 'node:assert/strict';
import {createJournalUI} from '../src/ui/journal.mjs';

function node(tag,text='',className=''){
 const item={tag,text,className,children:[],attributes:{},dataset:{},style:{},disabled:false,append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(key,value){this.attributes[key]=value;},get textContent(){return [this.text,...this.children.map(child=>child.textContent)].filter(Boolean).join(' ');}};
 return item;
}
function all(item,predicate){return [...(predicate(item)?[item]:[]),...item.children.flatMap(child=>all(child,predicate))];}
function setup(meta={unlockedCharacters:['CH01','CH02','CH08','CH15','CH16','CH31'],unlockedPetIds:['PET01']}){
 const shell=node('main'),modals=[];let headingNode,selectedPetId=null;shell.querySelector=selector=>selector==='h1'?headingNode:null;
 const ui=createJournalUI({
  el:node,
  btn(text,action,className=''){const button=node('button',text,className);button.onclick=action;return button;},
  shell,heading(title){headingNode=node('h1',title);shell.replaceChildren(headingNode);},
  current:()=>({actionHistory:[]}),meta:()=>meta,activePet:()=>({id:'PET01'}),
  onSelectPet:id=>{selectedPetId=id;return true;},isSaveFailed:()=>false,onReturn(){},turnPage:(_layout,done)=>done(),
  modal(title,body,actions=[]){const entry={title,body,actions};modals.push(entry);return entry;}
 });
 return {ui,shell,modals,get headingNode(){return headingNode;},get selectedPetId(){return selectedPetId;}};
}

test('bag opens on badges with the approved tab order and omits item previews',()=>{
 const {ui,shell}=setup();ui.bag();
 const labels=all(shell,n=>n.tag==='button').map(n=>n.text).filter(text=>['아이템','배지','펫','캐릭터','마이룸'].includes(text));
 assert.deepEqual(labels,['배지','펫','캐릭터','마이룸']);
 assert.doesNotMatch(shell.textContent,/아이템/);
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

test('character collection cards hide names and open full information for unlocked silhouettes',()=>{
 const {ui,shell,modals}=setup();ui.bag('캐릭터');
 assert.doesNotMatch(shell.textContent,/카엘/);
 const card=all(shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='해금된 캐릭터 정보 보기')[0];
 assert.ok(card);
 card.onclick();
 assert.match(modals.at(-1).title,/캐릭터 정보/);
 assert.match(modals.at(-1).body.textContent,/카엘/);
});

test('locked character silhouette opens its real unlock requirement without revealing its name',()=>{
 const {ui,shell,modals}=setup();ui.bag('캐릭터');
 assert.doesNotMatch(shell.textContent,/시온/);
 const card=all(shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='미해금 캐릭터 해금 방법 보기')[0];
 assert.ok(card);
 card.onclick();
 assert.match(modals.at(-1).title,/해금 안내/);
 assert.match(modals.at(-1).body.textContent,/궁금한 건 못 참아/);
 assert.match(modals.at(-1).body.textContent,/5\/8/);
 assert.doesNotMatch(modals.at(-1).body.textContent,/시온/);
});

test('pet silhouettes use the same name-free cards and show the real pet unlock requirement',()=>{
 const {ui,shell,modals}=setup();ui.bag('펫');
 assert.doesNotMatch(shell.textContent,/에든|루엔/);
 const locked=all(shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='미해금 펫 해금 방법 보기')[0];
 assert.ok(locked);
 locked.onclick();
 assert.match(modals.at(-1).body.textContent,/첫 엔딩 열람 완료/);
 assert.doesNotMatch(modals.at(-1).body.textContent,/루엔/);
 const unlocked=all(shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='해금된 펫 정보 보기')[0];
 unlocked.onclick();
 assert.match(modals.at(-1).title,/펫 정보/);
 assert.match(modals.at(-1).body.textContent,/에든/);
});

test('unlocked pet selection remains available from its information dialog',()=>{
 const state=setup({unlockedCharacters:['CH01','CH02','CH08','CH15','CH16','CH31'],unlockedPetIds:['PET01','PET02']}),{ui,shell,modals}=state;ui.bag('펫');
 const unlocked=all(shell,n=>n.className.includes('collection-card-trigger')&&n.attributes['aria-label']==='해금된 펫 정보 보기')[1];
 unlocked.onclick();
 assert.equal(modals.at(-1).actions[0].text,'함께하기');
 modals.at(-1).actions[0].onclick();
 assert.equal(state.selectedPetId,'PET02');
});
