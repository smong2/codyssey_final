import test from 'node:test';
import assert from 'node:assert/strict';
import * as contextApi from '../src/core/client-context.mjs';
import {createLocalRepository,createBoundaryWriter,validateProfile,STORAGE_KEY} from '../src/core/storage.mjs';
import {createProfile,startRun,setSchedule,beginAction,applyAction} from '../src/core/state.mjs';
import {acceptCollectionReceipts,unreadRoomIds,markRoomNoticesRead} from '../src/core/collection-notices.mjs';
import {createPostActivityStoryFlow} from '../src/core/post-activity-story.mjs';

test('account-scoped preview storage never reads another account or the original local preview',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const original=createProfile();startRun(original,1,'CH01');createLocalRepository(storage).save(original);
 const a=createLocalRepository(contextApi.createAccountStorage(storage,'alice'));
 assert.equal(a.load().slots[0].status,'EMPTY');const profile=a.load();startRun(profile,1,'CH02');a.save(profile);
 const b=createLocalRepository(contextApi.createAccountStorage(storage,'bob'));
 assert.equal(b.load().slots[0].status,'EMPTY');assert.equal(a.load().slots[0].activeRun.characterId,'CH02');
 assert.equal(createLocalRepository(storage).load().slots[0].activeRun.characterId,'CH01');
 assert.equal(values.size,2);assert.ok(values.has(STORAGE_KEY));
 assert.throws(()=>contextApi.createAccountStorage(storage,''));
});
test('a story decision cannot cross slots, and ambiguous legacy decisions are not guessed',()=>{
 const events=[{slotId:2,activityToken:'1:8:0',eventId:'NPC_WORK_01'},{slotId:1,activityToken:'1:8:0',eventId:'LOC_WRK_01'}];
 assert.equal(contextApi.selectActivityEvent(events,{slotId:1,activityToken:'1:8:0'}).eventId,'LOC_WRK_01');
 assert.equal(contextApi.selectActivityEvent(events,{slotId:3,activityToken:'1:8:0'}),null);
 assert.equal(contextApi.selectActivityEvent(null,{slotId:1,activityToken:'1:8:0'}),null);
 assert.equal(contextApi.selectActivityEvent([{activityToken:'1:8:0',eventId:'legacy'}],{slotId:1,activityToken:'1:8:0'}).eventId,'legacy');
 assert.equal(contextApi.selectActivityEvent([{activityToken:'1:8:0',eventId:'one'},{activityToken:'1:8:0',eventId:'two'}],{slotId:1,activityToken:'1:8:0'}),null);
 assert.equal(contextApi.selectActivityEvent(events,{slotId:1,activityToken:'1:8:1'}),null);
});

test('authenticated event ownership requires matching account and explicit slot',()=>{
 const events=[{uid:'bob',slotId:1,activityToken:'1:8:0',id:'foreign'},{slotId:1,activityToken:'1:8:0',id:'legacy'},{uid:'alice',slotId:1,activityToken:'1:8:0',id:'owned'}];
 assert.equal(contextApi.selectActivityEvent(events,{uid:'alice',slotId:1,activityToken:'1:8:0'}).id,'owned');
 assert.equal(contextApi.selectActivityEvent(events.slice(0,2),{uid:'alice',slotId:1,activityToken:'1:8:0'}),null);
 assert.equal(contextApi.selectActivityEvent([events[2]],{slotId:1,activityToken:'1:8:0'}),null);
 assert.equal(contextApi.selectActivityEvent([{uid:'alice',activityToken:'1:8:0'}],{uid:'alice',slotId:1,activityToken:'1:8:0'}),null);
});

test('activity receipt waits for successful result save and remains deduplicated after reconnect',()=>{
 let raw=null,blocked=false,continuation=null,shown=0,advanced=0;
 const storage={getItem:()=>raw,setItem:(_,value)=>{if(blocked)throw Error('quota');raw=value;}},repository=createLocalRepository(storage),writer=createBoundaryWriter(repository);
 const profile=createProfile(),run=startRun(profile,1,'CH01');run.mainStory.pendingId=null;
 setSchedule(profile,1,['adventure','rest','rest','rest','rest']);beginAction(profile,1,'1:1:0');applyAction(profile,1,'1:1:0',{gameId:'adventure',outcome:'complete'});
 profile.meta.collectionView={rooms:[{id:'room-2',pieces:[0],unlocked:false}]};
 const events=[{uid:'bob',slotId:'slot-1',activityToken:'1:1:0',receiptId:'foreign',roomId:'room-2',pieceCount:1,unlocked:false},
 {uid:'alice',slotId:'slot-1',activityToken:'1:1:0',receiptId:'actual',roomId:'room-2',pieceCount:1,unlocked:false}];
 const own=events.filter(event=>contextApi.ownsActivityEvent(event,{uid:'alice',slotId:'slot-1',activityToken:'1:1:0'})).map(({uid,...receipt})=>receipt);
 const notices=acceptCollectionReceipts(profile.meta,own);
 const flow=createPostActivityStoryFlow({current:()=>run,receive:()=>null,onStory(){throw Error('no invented story');},onContinue:()=>advanced++,save:next=>{continuation=next;try{writer.save(profile,1);}catch{return false;}const done=continuation;continuation=null;done();return true;}});
 blocked=true;assert.equal(flow.complete(run.actionHistory.at(-1),next=>{shown+=notices.length;next();}),false);
 assert.equal(shown,0);assert.equal(advanced,0);assert.equal(raw,null);
 blocked=false;writer.retry();const done=continuation;continuation=null;done();
 assert.equal(shown,1);assert.equal(advanced,1);assert.equal(run.day,1);assert.equal(run.stamina,85);
 const loaded=repository.load();assert.deepEqual(unreadRoomIds(loaded.meta),['room-2']);
 assert.deepEqual(acceptCollectionReceipts(loaded.meta,own),[]);assert.deepEqual(loaded.meta.collectionNoticeState.processedIds,['actual']);
 assert.deepEqual(loaded.meta.collectionView.rooms[0].pieces,[0]);
});

test('read-state save retry preserves the exact notice snapshot and rejects corrupt state before any write',()=>{
 let raw=null,blocked=false;const repository=createLocalRepository({getItem:()=>raw,setItem:(_,value)=>{if(blocked)throw Error('quota');raw=value;}}),writer=createBoundaryWriter(repository);
 const profile=createProfile();profile.meta.collectionView={rooms:[{id:'room-1',pieces:[0],unlocked:false}]};
 acceptCollectionReceipts(profile.meta,[{receiptId:'one',slotId:'slot-1',activityToken:'1:1:0',roomId:'room-1',pieceCount:1,unlocked:false}]);repository.save(profile);
 const old=structuredClone(profile.meta.collectionNoticeState);markRoomNoticesRead(profile.meta,'room-1');blocked=true;
 assert.throws(()=>writer.save(profile));profile.meta.collectionNoticeState=old;
 assert.deepEqual(unreadRoomIds(repository.load().meta),['room-1']);blocked=false;writer.retry();assert.deepEqual(unreadRoomIds(repository.load().meta),[]);
 profile.meta.collectionNoticeState={processedIds:['one','one'],unreadRoomIds:[]};const before=raw;
 assert.throws(()=>validateProfile(profile));assert.throws(()=>repository.save(profile));assert.equal(raw,before);
});
