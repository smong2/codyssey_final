import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptCollectionReceipts,markRoomNoticesRead,unreadRoomIds,validateCollectionNoticeState} from '../src/core/collection-notices.mjs';
import {renderRoomPanel} from '../src/ui/collection-panels.mjs';
import * as notices from '../src/core/collection-notices.mjs';
test('received ownership changes produce badge, room and unlock notices once without awarding anything',()=>{
 assert.equal(typeof notices.acceptCollectionChanges,'function');
 const previous={unlockedPetIds:['PET01'],unlockedCharacters:['CH01'],collectionView:{rooms:[],badges:[]}};
 const next={...structuredClone(previous),pendingCharacterUnlockIds:['CH03'],unlockedPetIds:['PET01','PET02'],collectionView:{rooms:[{id:'room-1',pieces:[0],unlocked:false}],badges:[{categoryId:'forest',subcategoryTitle:'오늘도 탐험!',earnedTiers:[1]}]}};
 const result=notices.acceptCollectionChanges(previous,next);
 assert.equal(result.length,3);assert.equal(notices.pendingBadgeReceipts(next).length,1);assert.deepEqual(notices.unreadRoomIds(next),['room-1']);
 assert.deepEqual(next.unlockedCharacters,['CH01']);assert.deepEqual(notices.acceptCollectionChanges(previous,next),[]);
});

const metaWithRooms=()=>({collectionView:{rooms:[{id:'room-2',pieces:[0,1,2,3,4,5,6,7],unlocked:false}]}});
const receipt=(overrides={})=>({receiptId:'receipt-1',slotId:'slot-1',activityToken:'1:1:0',roomId:'room-2',pieceCount:8,unlocked:false,...overrides});

test('accepts a validated receipt once and keeps it deduplicated after JSON reload',()=>{
 const meta=metaWithRooms();
 assert.deepEqual(acceptCollectionReceipts(meta,[receipt()]),[{receiptId:'receipt-1',roomId:'room-2',message:'퍼즐 조각을 발견했어요! 기숙사방 2 · 8 / 12'}]);
 assert.deepEqual(unreadRoomIds(JSON.parse(JSON.stringify(meta))),['room-2']);
 assert.deepEqual(acceptCollectionReceipts(JSON.parse(JSON.stringify(meta)),[receipt()]),[]);
});

test('completion notice requires explicit unlocked state and exactly twelve owned pieces',()=>{
 const meta={collectionView:{rooms:[{id:'room-1',pieces:Array.from({length:12},(_,i)=>i),unlocked:true}]}};
 assert.equal(acceptCollectionReceipts(meta,[receipt({receiptId:'done-1',roomId:'room-1',pieceCount:12,unlocked:true})])[0].message,'새로운 마이룸 배경을 완성했어요! 가방 > 마이룸에서 확인해보세요.');
});

test('rejects the full receipt batch before changing notice state when any receipt contradicts saved ownership',()=>{
 const meta=metaWithRooms();
 assert.throws(()=>acceptCollectionReceipts(meta,[receipt(),receipt({receiptId:'bad',pieceCount:7})]));
 assert.equal(meta.collectionNoticeState,undefined);
});

test('read state clears only unread indicators and malformed state is rejected',()=>{
 const meta=metaWithRooms();acceptCollectionReceipts(meta,[receipt(),receipt({receiptId:'receipt-2',roomId:'room-2'})]);
 markRoomNoticesRead(meta,'room-2');assert.deepEqual(unreadRoomIds(meta),[]);assert.deepEqual(meta.collectionNoticeState.processedIds,['receipt-1','receipt-2']);
 assert.equal(validateCollectionNoticeState(meta.collectionNoticeState),true);
 assert.throws(()=>validateCollectionNoticeState({processedIds:['x','x'],unreadRoomIds:['room-1']}));
});

test('room panel marks unread rooms and reads them only when their detail is opened',()=>{
 const meta=metaWithRooms();acceptCollectionReceipts(meta,[receipt()]);const nodes=[];
 const el=(tag,text='',className='')=>({tag,text,className,children:[],style:{},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},setAttribute(){},get textContent(){return [this.text,...this.children.map(item=>item.textContent)].filter(Boolean).join(' ');},set textContent(value){this.text=value;this.children=[];}});
 const btn=(text,action,className='')=>{const item=el('button',text,className);item.onclick=action;return item;};
 const panel=el('section');renderRoomPanel(panel,{el,btn,meta:()=>meta,onReadRoomNotices:id=>markRoomNoticesRead(meta,id)});
 assert.ok(panel.textContent.includes('NEW'));assert.deepEqual(unreadRoomIds(meta),['room-2']);
 const visit=item=>[item,...item.children.flatMap(visit)];const detail=visit(panel).filter(item=>item.className.includes('room-card-trigger')).at(2);detail.onclick();
 assert.deepEqual(unreadRoomIds(meta),[]);
});
