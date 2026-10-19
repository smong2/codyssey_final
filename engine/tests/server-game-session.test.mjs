import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerDialogueSession,createServerGameSession} from '../src/core/server-game-session.mjs';

const empty=id=>({slotId:id,status:'EMPTY',completedRunCount:0,lastCompletedCharacterId:null,lastEndingId:null,createdAt:null,lastSavedAt:null,saveVersion:1,gameDataVersion:'v1',activeRun:null,serverRevision:0});
const playing=(revision=3,activeRun={runId:'run-1',runNumber:1,characterId:'CH01',week:1,day:'MONDAY',phase:'MAIN_STORY_PENDING',storyCast:{},pendingStoryEvent:{eventId:'MS01'},stats:{knowledge:50,expression:50,skill:50,exploration:50,magic:50},stamina:{current:100,max:100},hiddenStats:{},forcedRest:{active:false,remainingWeekdays:0},minigameFailStreaks:{},runStatistics:{classCounts:{}},weeklySchedule:{}})=>({...empty(1),status:'PLAYING',activeRun,serverRevision:revision});
const ROOM_01_PIECES=Array.from({length:12},(_,index)=>`PUZZLE_ROOM_01_${String(index+1).padStart(2,'0')}`);
const collection={meta:{unlockedCharacterIds:['CH01'],unlockedPetIds:['PET01','PET02'],permanentBonuses:{knowledge:0,expression:0,skill:0,exploration:0,magic:0},seenEndingIds:[],acquiredBadgeIds:[],acquiredPuzzlePieceIds:ROOM_01_PIECES,unlockedRoomBackgroundIds:['ROOM_DEFAULT','ROOM_01'],playedCharacterIds:[]},statistics:{totalMinigamePlayCount:0,totalClassCount:0,totalAdventureCount:0,endingViewCounts:{}},pendingCharacterUnlockIds:[],settings:{activePetId:'PET01',activeRoomBackgroundId:'ROOM_DEFAULT'}};

test('server mutation uses current revision and retains the identical request for explicit retry',async()=>{
 let current=playing(),attempt=0,bootstraps=0;const calls=[];
 const services={bootstrapAccount:async()=>{bootstraps++;return {created:false};},listSaveSlots:async()=>({slots:[current,...[2,3,4,5].map(empty)]}),getCollection:async()=>collection,getSaveSlot:async()=>current,async recoverSaveSlot(slotId,input){calls.push({slotId,input:structuredClone(input)});if(++attempt===1)throw new Error('offline');current=playing(4,{...current.activeRun,phase:'MY_ROOM_RECOVERY',pendingStoryEvent:null});return {serverRevision:4};}};
 const game=createServerGameSession({services,requestIdFactory:()=> 'request-fixed'});await game.load();
 assert.equal(bootstraps,0);
 await game.bootstrap({privacyConsentAccepted:true,privacyConsentVersion:'2026-10-15'});assert.equal(bootstraps,1);
 await assert.rejects(()=>game.recoverSaveSlot(1),/offline/);assert.equal(game.pending().input.requestId,'request-fixed');assert.equal(game.pending().input.expectedServerRevision,3);
 await game.retry();assert.deepEqual(calls[1],calls[0]);assert.equal(game.slot(1).serverRevision,4);assert.equal(game.pending(),null);
});

test('unreadable slot deletion does not invent a server revision and refreshes the reset slot',async()=>{
 let broken={slotId:2,status:'LOAD_ERROR'},input;
 const services={bootstrapAccount:async()=>({created:false}),listSaveSlots:async()=>({slots:[empty(1),broken,...[3,4,5].map(empty)]}),getCollection:async()=>collection,getSaveSlot:async()=>empty(2),deleteUnreadableSaveSlot:async(_slotId,body)=>{input=structuredClone(body);broken=empty(2);return {serverRevision:0};}};
 const game=createServerGameSession({services,requestIdFactory:()=> 'delete-broken'});await game.load();await game.deleteUnreadableSaveSlot(2);
 assert.deepEqual(input,{confirm:true,resetUnreadable:true,requestId:'delete-broken'});assert.equal(game.slot(2).status,'EMPTY');assert.equal(game.slot(2).serverRevision,0);
});

test('revision conflict can discard the stale mutation and refresh authoritative slot state',async()=>{
 let current=playing(),calls=0;
 const conflict=Object.assign(new Error('revision conflict'),{status:409,code:'CONFLICT'});
 const services={bootstrapAccount:async()=>({created:false}),listSaveSlots:async()=>({slots:[current,...[2,3,4,5].map(empty)]}),getCollection:async()=>collection,getSaveSlot:async()=>current,
  async recoverSaveSlot(){calls++;throw conflict;}};
 const game=createServerGameSession({services,requestIdFactory:()=> 'stale-request'});await game.load();
 await assert.rejects(()=>game.recoverSaveSlot(1),error=>error===conflict);
 assert.equal(game.pending().input.expectedServerRevision,3);
 current=playing(4,{...current.activeRun,phase:'MY_ROOM_RECOVERY',pendingStoryEvent:null});
 await game.resolveConflict();
 assert.equal(calls,1);assert.equal(game.pending(),null);assert.equal(game.slot(1).serverRevision,4);
 assert.equal(game.slot(1).activeRun.phase,'ACTING');
 assert.equal(game.slot(1).activeRun.serverPhase,'MY_ROOM_RECOVERY');
});

test('schedule confirmation reuses returned revision and activity start skips unrelated collection refresh',async()=>{
 let current=playing(),slotReads=0,collectionReads=0;
 const services={bootstrapAccount:async()=>({created:false}),listSaveSlots:async()=>({slots:[current,...[2,3,4,5].map(empty)]}),getCollection:async()=>{collectionReads++;return collection;},getSaveSlot:async()=>{slotReads++;return current;},
  confirmSchedule:async()=>({serverRevision:4}),startActivity:async()=>{current=playing(5,{...current.activeRun,phase:'ACTIVITY_IN_PROGRESS',pendingStoryEvent:null});return {serverRevision:5};}};
 const game=createServerGameSession({services,requestIdFactory:()=> 'fast-path'});await game.load();
 assert.equal(collectionReads,1);assert.equal(slotReads,0);
 await game.confirmSchedule(1,['REST_DEFAULT','REST_DEFAULT','REST_DEFAULT','REST_DEFAULT','REST_DEFAULT']);
 assert.equal(game.slot(1).serverRevision,4);assert.equal(slotReads,0);assert.equal(collectionReads,1);
 await game.startActivity(1);
 assert.equal(game.slot(1).serverRevision,5);assert.equal(slotReads,1);assert.equal(collectionReads,1);
});

test('dialogue session applies authoritative activeRun before continuation and never exposes hidden stats',async()=>{
 let current=playing(),continued=0;const rendered=[];const services={bootstrapAccount:async()=>({created:false}),listSaveSlots:async()=>({slots:[current,...[2,3,4,5].map(empty)]}),getCollection:async()=>collection,getSaveSlot:async()=>current,
  loadDialogue:async({eventId})=>({schemaVersion:1,dialogueId:'D1',storyId:'S1',eventId,title:'메인',dialogueToken:'token',canSkip:false,speakers:{},sequence:[{type:'END'}]}),
  completeDialogue:async input=>{const activeRun={...current.activeRun,phase:'STORY_COMPLETE',pendingStoryEvent:null,stats:{...current.activeRun.stats,knowledge:52},hiddenStats:{empathy:8},dialogueHistory:[{eventId:'MS01',storyId:'S1',title:'메인',week:1,day:0,completionMode:input.completionMode,selectedChoices:[],effect:{growth:{knowledge:2}}}]};current=playing(4,activeRun);return {success:true,completionMode:input.completionMode,serverRevision:4,activeRun,appliedSummary:{visibleStatDelta:{knowledge:2}}};}};
 const game=createServerGameSession({services});await game.load();
 const dialogue=createServerDialogueSession({game,services,slotId:()=>1,onRender:(payload,handlers)=>rendered.push({payload,handlers}),onContinue:()=>continued++,requestIdFactory:()=> 'dialogue-request'});
 assert.equal(await dialogue.start({slotId:1,eventId:'MS01'}),true);
 assert.equal(await rendered[0].handlers.onComplete({completionMode:'COMPLETE',selectedChoices:[]}),true);
 assert.equal(game.slot(1).activeRun.stats.knowledge,52);assert.equal(game.slot(1).activeRun.hiddenStats,undefined);assert.equal(game.slot(1).activeRun.dialogueHistory[0].eventId,'MS01');assert.equal(game.slot(1).serverRevision,4);assert.equal(continued,1);
 await game.refreshSlot(1,{collection:false});assert.equal(game.slot(1).activeRun.dialogueHistory[0].title,'메인');
});

test('server dialogue can retry a failed load with the same pending event',async()=>{
 let loads=0,retry;const rendered=[];
 const services={loadDialogue:async({eventId})=>{
  if(++loads===1)throw new Error('asset unavailable');
  return {schemaVersion:1,eventId,dialogueToken:'token',canSkip:false,speakers:{},sequence:[{type:'END'}]};
 }};
 const game={currentRevision:()=>3,applyDialogueResult:async()=>{}};
 const dialogue=createServerDialogueSession({game,services,slotId:()=>1,onRender:payload=>rendered.push(payload),onError:(_error,again)=>{retry=again;}});
 assert.equal(await dialogue.start({slotId:1,eventId:'LOC_OBS_01'}),false);
 assert.equal(typeof retry,'function');
 assert.equal(await retry(),true);
 assert.equal(loads,2);
 assert.equal(rendered[0].eventId,'LOC_OBS_01');
});

test('account settings refresh the projected shared pet and room selection',async()=>{
 let accountCollection=structuredClone(collection);const services={bootstrapAccount:async()=>({created:false}),listSaveSlots:async()=>({slots:[playing(),...[2,3,4,5].map(empty)]}),getSaveSlot:async()=>playing(),getCollection:async()=>accountCollection,
  updateAccountSettings:async command=>{accountCollection={...accountCollection,settings:{...accountCollection.settings,...command}};return structuredClone(accountCollection.settings);}};
 const game=createServerGameSession({services});await game.load();assert.equal(game.profile().settings.activePetId,'PET01');
 await game.updateSettings({activePetId:'PET02',activeRoomBackgroundId:'ROOM_01'});assert.equal(game.profile().settings.activePetId,'PET02');assert.equal(game.profile().settings.activeRoomBackgroundId,'room-1');
});
