import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile} from '../src/core/state.mjs';
import {STORAGE_KEY} from '../src/core/storage.mjs';
import {inspectLocalSlots,deleteUnreadableSlot} from '../src/core/slot-recovery.mjs';
import {createSlotRecoveryUI} from '../src/ui/slot-recovery.mjs';

function storageFor(raw){let writes=0;return {get writes(){return writes;},getItem(key){assert.equal(key,STORAGE_KEY);return raw;},setItem(key,value){assert.equal(key,STORAGE_KEY);writes++;raw=value;},read(){return raw;}};}
function corruptedProfile(slotId=2){const p=createProfile();p.slots[slotId-1]={...p.slots[slotId-1],status:'PLAYING',activeRun:{broken:true}};return p;}

test('inspection preserves healthy slots and marks only independently corrupt slots without writing',()=>{
 const p=createProfile();p.meta.badges.push('kept');p.slots[0].status='RUN_COMPLETE';p.slots[0].completedRunCount=3;
 p.slots[1]={...p.slots[1],status:'PLAYING',activeRun:{broken:true}};
 const storage=storageFor(JSON.stringify(p)),result=inspectLocalSlots(storage);
 assert.equal(storage.writes,0);assert.equal(result.profile,null);assert.equal(result.canDelete,true);
 assert.deepEqual(result.slots[0],p.slots[0]);assert.deepEqual(result.slots[1],{slotId:2,status:'LOAD_ERROR'});
 assert.equal(result.slots[2].status,'EMPTY');assert.equal(result.error,'저장 기록을 확인할 수 없습니다.');
});

test('missing data produces a valid default profile and global corruption disables deletion',()=>{
 const empty=inspectLocalSlots(storageFor(null));assert.deepEqual(empty.profile,createProfile());assert.equal(empty.canDelete,true);
 for(const raw of ['{broken',JSON.stringify({...createProfile(),meta:null}),JSON.stringify({...createProfile(),slots:[{slotId:1,status:'EMPTY'}]})]){
  const storage=storageFor(raw),result=inspectLocalSlots(storage);
  assert.equal(result.profile,null);assert.equal(result.canDelete,false);assert.deepEqual(result.slots.map(s=>s.status),Array(5).fill('LOAD_ERROR'));assert.equal(storage.writes,0);
 }
 const readFailure=inspectLocalSlots({getItem(){throw new Error('denied');}});
 assert.equal(readFailure.canDelete,false);assert.equal(readFailure.profile,null);assert.deepEqual(readFailure.slots.map(s=>s.status),Array(5).fill('LOAD_ERROR'));
});

test('deleting one unreadable slot preserves all other slot values and global metadata',()=>{
 const p=corruptedProfile(2);p.meta.badges.push('meta');p.settings.custom='setting';p.slots[2].extension={keep:true};
 const storage=storageFor(JSON.stringify(p));const before=JSON.parse(storage.read());
 const result=deleteUnreadableSlot(storage,2);const after=JSON.parse(storage.read());
 assert.deepEqual(result,{slotId:2,status:'EMPTY',completedRunCount:0,activeRun:null,lastSavedAt:null});
 assert.deepEqual(after.slots[0],before.slots[0]);assert.deepEqual(after.slots[2],before.slots[2]);
 assert.deepEqual(after.meta,before.meta);assert.deepEqual(after.settings,before.settings);assert.equal(storage.writes,1);
});

test('deletion rejects a repaired target, stale snapshot, global corruption and write errors',()=>{
 let p=corruptedProfile();let storage=storageFor(JSON.stringify(p));
 p.slots[1]={slotId:2,status:'EMPTY',completedRunCount:0,activeRun:null,lastSavedAt:null};storage=storageFor(JSON.stringify(p));
 assert.throws(()=>deleteUnreadableSlot(storage,2),/손상된 슬롯이 아닙니다/);assert.equal(storage.writes,0);
 p=corruptedProfile();storage=storageFor(JSON.stringify(p));let reads=0;const read=storage.getItem.bind(storage);
 storage.getItem=key=>{reads++;return reads===2?'{"version":1}':read(key);};
 assert.throws(()=>deleteUnreadableSlot(storage,2),/변경됐습니다/);assert.equal(storage.writes,0);
 storage=storageFor('{broken');assert.throws(()=>deleteUnreadableSlot(storage,2),/확인할 수 없어/);assert.equal(storage.writes,0);
 storage=storageFor(JSON.stringify(corruptedProfile()));storage.setItem=()=>{throw new Error('quota');};
 assert.throws(()=>deleteUnreadableSlot(storage,2),/quota/);
});

test('deletion rejects a healthy target even when a different slot is damaged',()=>{
 const p=corruptedProfile(2);p.slots[4]={...p.slots[4],status:'PLAYING',activeRun:{alsoBroken:true}};
 const storage=storageFor(JSON.stringify(p));
 assert.throws(()=>deleteUnreadableSlot(storage,3),/손상된 슬롯이 아닙니다/);assert.equal(storage.writes,0);
 assert.deepEqual(deleteUnreadableSlot(storage,2),{slotId:2,status:'EMPTY',completedRunCount:0,activeRun:null,lastSavedAt:null});
 assert.deepEqual(JSON.parse(storage.read()).slots[4],p.slots[4]);assert.equal(storage.writes,1);
});

function node(tag='div',text=''){return {tag,_text:text,children:[],get textContent(){return this._text+this.children.map(child=>child.textContent??'').join('');},set textContent(value){this._text=value;},disabled:false,append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(){},className:''};}
test('recovery UI requires a second explicit click and retains delete failure with retry path',async()=>{
 const el=(tag,text)=>node(tag,text),actions=[];let removed=0,retries=0;
 const ui=createSlotRecoveryUI({el,btn:(label,onclick)=>Object.assign(node('button',label),{onclick}),modal:(title,body,buttons)=>{const value={title,body,buttons};actions.push(value);return value;},onRetry(){retries++;},async onDelete(){removed++;throw new Error('quota');}});
 const card=ui.card(4);assert.match(card.textContent,/저장 기록을 확인할 수 없습니다/);assert.equal(card.children[0].textContent,'슬롯 4');
 card.children[2].children[0].onclick();assert.equal(retries,1);card.children[2].children[1].onclick();assert.equal(removed,0);
 const modal=actions[0];assert.match(modal.body.textContent,/복구할 수 없습니다/);assert.match(modal.body.textContent,/계정 전체 진행은 유지됩니다/);
 assert.equal(removed,0);await modal.buttons.find(b=>b.textContent==='삭제').onclick();assert.equal(removed,1);
 assert.match(modal.body.textContent,/quota/);assert.ok(modal.buttons.some(b=>b.textContent==='다시 시도'));
});

test('a rejected deletion can be retried successfully without duplicate retry controls',async()=>{
 const el=(tag,text)=>node(tag,text);let attempts=0;let dialog;
 const ui=createSlotRecoveryUI({el,btn:(label,onclick)=>Object.assign(node('button',label),{onclick}),modal:(title,body,buttons)=>{dialog={title,body,buttons:[...buttons],querySelector:()=>({append(...items){dialog.buttons.push(...items);}}),close(){}};return dialog;},async onDelete(){attempts++;throw new Error('temporary');}});
 ui.card(2).children[2].children[1].onclick();
 await dialog.buttons.find(b=>b.textContent==='삭제').onclick();
 assert.equal(attempts,1);assert.equal(dialog.buttons.filter(b=>b.textContent==='다시 시도').length,1);
 await dialog.buttons.find(b=>b.textContent==='다시 시도').onclick();
 assert.equal(attempts,2);assert.equal(dialog.buttons.filter(b=>b.textContent==='다시 시도').length,1);
});

test('failed slot inspection reuses one retry button and one persistent error while blocking concurrent retries',async()=>{
 const el=(tag,text,cls)=>Object.assign(node(tag,text),{className:cls??''});let attempts=0,rejectCurrent;
 const ui=createSlotRecoveryUI({el,btn:(label,onclick)=>Object.assign(node('button',label),{onclick}),modal(){},onRetry(){attempts++;return new Promise((_,reject)=>{rejectCurrent=reject;});}});
 const card=ui.card(5),actions=card.children[2],retry=actions.children[0];
 retry.onclick();retry.onclick();assert.equal(attempts,1);assert.equal(retry.disabled,true);
 rejectCurrent(new Error('read one'));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(actions.children.filter(item=>item.textContent==='다시 시도').length,1);
 assert.equal(card.children.filter(item=>item.className==='slot-recovery-error').length,1);
 retry.onclick();retry.onclick();assert.equal(attempts,2);
 rejectCurrent(new Error('read two'));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(actions.children.filter(item=>item.textContent==='다시 시도').length,1);
 const errors=card.children.filter(item=>item.className==='slot-recovery-error');assert.equal(errors.length,1);assert.match(errors[0].textContent,/read two/);assert.equal(retry.disabled,false);
});
