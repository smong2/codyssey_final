import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASSES} from '../src/core/classes.mjs';
import {storyDiaryRecords} from '../src/core/activity-history.mjs';
import {applyServerSlot,canRecordServerRoomVisit,createServerProfile,isServerEndingPhase,projectServerRun,serverClassStartData,serverRoomBackgroundId,serverRoomVisitKey,serverScheduleActivityIds} from '../src/core/server-state.mjs';

const run={runId:'run-1',runNumber:1,characterId:'CH01',week:2,day:'TUESDAY',phase:'ACTIVITY_STORY_PENDING',storyCast:{GUIDE:'CH16'},pendingStoryEvent:{eventId:'NPC_GUIDE_01',eventType:'NPC'},stats:{knowledge:60,expression:61,skill:62,exploration:63,magic:64},stamina:{current:75,max:100},hiddenStats:{empathy:99},forcedRest:{active:false,remainingWeekdays:0},minigameFailStreaks:{'rune-circuit':2},runStatistics:{classCounts:{knowledge:1,expression:0,skill:0,exploration:0,magic:0}},weeklySchedule:{MONDAY:{type:'CLASS',contentId:'rune-circuit',status:'COMPLETED',resolution:'SUCCESS',staminaBefore:100,staminaCost:10,growthApplied:5},TUESDAY:{type:'ADVENTURE',contentId:'ADV_LIBRARY',status:'IN_PROGRESS',staminaBefore:90,staminaCost:15,adventureDifficulty:2,objectiveCount:3,durationSeconds:120,adventureSeed:'seed',missionId:'mission'},WEDNESDAY:{type:'REST',contentId:'REST_DEFAULT',status:'PLANNED'},THURSDAY:{type:'SPECIAL',contentId:'fairy-trade',status:'PLANNED'},FRIDAY:{type:'CLASS',contentId:'sealed-shelves',status:'PLANNED'}}};

test('Friday interrupted recovery resumes at the weekend instead of starting Friday again',()=>{
 const schedule=Object.fromEntries(Object.entries(run.weeklySchedule).map(([day,entry])=>[day,{...entry,status:'COMPLETED',resolution:day==='FRIDAY'?'INTERRUPTED':'SUCCESS'}]));
 const projected=projectServerRun({...run,day:'FRIDAY',phase:'MY_ROOM_RECOVERY',completedWeekdayCount:5,pendingStoryEvent:null,weeklySchedule:schedule});
 assert.equal(projected.phase,'WEEK_COMPLETE');assert.equal(projected.day,5);assert.equal(projected.inProgressActivity,undefined);
});

test('server run is projected to the existing engine display model without hidden stats',()=>{
 const value=projectServerRun(run);
 assert.equal(value.stats.dexterity,62);assert.equal(value.stats.skill,undefined);assert.equal(value.hiddenStats,undefined);
 assert.equal(value.day,1);assert.equal(value.phase,'ACTING');assert.equal(value.serverPhase,'ACTIVITY_STORY_PENDING');
 assert.deepEqual(value.schedule,['rune-circuit','adventure','rest','fairy-trade','sealed-shelves']);
 assert.deepEqual(value.scheduleLocations,[null,'library',null,null,null]);
 assert.equal(value.pendingStoryEvent.eventId,'NPC_GUIDE_01');assert.equal(value.inProgressActivity.locationId,'library');assert.equal(value.inProgressActivity.serverStart.targetCount,3);
 assert.equal(value.actionHistory[0].effect.growth.magic,5);assert.equal(value.actionHistory[0].effect.staminaAfter,90);
});

test('server activity history survives a week rollover for calendar and diary projection',()=>{
 const history=[
  {week:1,day:0,type:'CLASS',contentId:'rune-circuit',status:'COMPLETED',resolution:'SUCCESS',staminaBefore:100,staminaCost:10,growthApplied:4},
  {week:1,day:1,type:'ADVENTURE',contentId:'ADV_LIBRARY',status:'COMPLETED',resolution:'MISSION_COMPLETE',staminaBefore:90,staminaCost:15,growthAwarded:{exploration:6}},
  {week:1,day:2,type:'REST',contentId:'REST_DEFAULT',status:'COMPLETED',resolution:'SUCCESS',staminaBefore:75,staminaCost:0,staminaRecovered:25},
 ];
 const value=projectServerRun({...run,week:2,day:'MONDAY',phase:'SCHEDULE_READY',pendingStoryEvent:null,weeklySchedule:{},activityHistory:history});
 assert.equal(value.actionHistory.length,3);assert.deepEqual(value.actionHistory.map(item=>[item.week,item.day,item.action]),[[1,0,'rune-circuit'],[1,1,'adventure'],[1,2,'rest']]);
 assert.equal(value.actionHistory[1].locationId,'library');assert.equal(value.actionHistory[1].effect.growth.exploration,6);
});

test('server dialogue history projects durable story records and normalizes skill growth',()=>{
 const value=projectServerRun({...run,pendingStoryEvent:null,dialogueHistory:[{
  eventId:'MS01',storyId:'MS01',title:'각자의 이유로 아카데미에',week:1,day:0,completionMode:'COMPLETE',
  selectedChoices:[{choiceNodeId:'C1',choiceId:'A'}],effect:{growth:{knowledge:2,skill:1}},
 }],eventFlags:{MS01:true},storyProgress:{MS01:{status:'COMPLETED',step:1,lastAdvancedWeek:1}}});
 assert.equal(value.dialogueHistory.length,1);assert.equal(value.dialogueHistory[0].eventId,'MS01');
 assert.deepEqual(value.dialogueHistory[0].selectedChoices,[{choiceNodeId:'C1',choiceId:'A'}]);
 assert.deepEqual(value.dialogueHistory[0].effect.growth,{knowledge:2,dexterity:1});
 assert.equal(storyDiaryRecords(value)[0].title,'각자의 이유로 아카데미에');
});

test('legacy completed main story is restored into diary history without inventing choices or rewards',()=>{
 const value=projectServerRun({...run,pendingStoryEvent:null,eventFlags:{MS01:true},storyProgress:{MS01:{status:'COMPLETED',step:1,lastAdvancedWeek:1}}});
 assert.deepEqual(value.dialogueHistory,[{
  eventId:'MS01',storyId:'MS01',title:'각자의 이유로 아카데미에',week:1,day:0,
  completionMode:'COMPLETE',selectedChoices:[],effect:{growth:{}},
 }]);
 assert.equal(storyDiaryRecords(value)[0].eventId,'MS01');
});

test('weekly-summary and ending phases keep the existing UI gates',()=>{
 const summary=projectServerRun({...run,day:'MONDAY',phase:'WEEK_SUMMARY_PENDING',pendingStoryEvent:null,lastWeekSummary:{week:1,statDelta:{knowledge:2,expression:0,skill:1,exploration:0,magic:0}}});
 assert.equal(summary.phase,'PLANNING');assert.equal(summary.pendingWeekSummaryWeek,1);
 const final=projectServerRun({...run,week:52,day:'FRIDAY',phase:'FINAL_SUMMARY_PENDING',pendingStoryEvent:null,lastWeekSummary:{week:52}});
 assert.equal(final.phase,'AWAITING_ENDING');assert.equal(final.pendingWeekSummaryWeek,52);
});

test('server profile consumes account collection unlocks and maps skill permanent bonus',()=>{
 const empty=id=>({slotId:id,status:'EMPTY',completedRunCount:0,lastCompletedCharacterId:null,lastEndingId:null,createdAt:null,lastSavedAt:null,saveVersion:1,gameDataVersion:'v1',activeRun:null,serverRevision:0});
 const pieces=Array.from({length:12},(_,index)=>`PUZZLE_ROOM_01_${String(index+1).padStart(2,'0')}`);
 const profile=createServerProfile([1,2,3,4,5].map(empty),{meta:{unlockedCharacterIds:['CH01','CH02'],unlockedPetIds:['PET01'],permanentBonuses:{knowledge:1,expression:2,skill:3,exploration:4,magic:5},seenEndingIds:['E1'],acquiredBadgeIds:['B1'],acquiredPuzzlePieceIds:pieces,unlockedRoomBackgroundIds:['ROOM_DEFAULT','ROOM_01'],playedCharacterIds:['CH01']},statistics:{totalMinigamePlayCount:8,totalClassCount:6,totalAdventureCount:2,endingViewCounts:{E1:1}},pendingCharacterUnlockIds:['CH03'],settings:{activePetId:'PET01',activeRoomBackgroundId:'ROOM_01'}});
 assert.equal(profile.serverBacked,true);assert.deepEqual(profile.meta.unlockedCharacters,['CH01','CH02']);assert.equal(profile.meta.permanentBonuses.dexterity,3);assert.equal(profile.meta.counters.minigames,8);assert.deepEqual(profile.meta.serverCollection.pendingCharacterUnlockIds,['CH03']);assert.equal(profile.settings.activeRoomBackgroundId,'room-1');assert.deepEqual(profile.meta.collectionView.rooms[0].pieces,Array.from({length:12},(_,index)=>index));assert.equal(profile.meta.collectionView.rooms[0].unlocked,true);
 assert.throws(()=>createServerProfile([1,2,3,4,5].map(empty),{meta:{unlockedCharacterIds:['CH01'],unlockedPetIds:['PET01'],permanentBonuses:{knowledge:0,expression:0,skill:0,exploration:0,magic:0},seenEndingIds:[],acquiredBadgeIds:[],acquiredPuzzlePieceIds:['PUZZLE_ROOM_01_01'],unlockedRoomBackgroundIds:['ROOM_DEFAULT','ROOM_01'],playedCharacterIds:[]},statistics:{},pendingCharacterUnlockIds:[],settings:{activePetId:'PET01',activeRoomBackgroundId:'ROOM_01'}}),/마이룸 수집/);
});

test('slot mutation envelopes preserve dialogue text enriched during the initial GET',()=>{
 const empty=id=>({slotId:id,status:'EMPTY',completedRunCount:0,lastCompletedCharacterId:null,lastEndingId:null,createdAt:null,lastSavedAt:null,saveVersion:1,gameDataVersion:'v1',activeRun:null,serverRevision:0});
 const raw={...run,pendingStoryEvent:null,dialogueHistory:[{eventId:'MS01',storyId:'MS01',title:'입학',week:1,day:0,completionMode:'COMPLETE',selectedChoices:[{choiceNodeId:'C1',choiceId:'A',text:'기존 선택 문구'}],effect:{growth:{knowledge:1}}}]};
 const slot={...empty(1),status:'PLAYING',activeRun:raw,serverRevision:3};
 const profile=createServerProfile([slot,...[2,3,4,5].map(empty)],{meta:{unlockedCharacterIds:['CH01'],unlockedPetIds:['PET01'],permanentBonuses:{knowledge:0,expression:0,skill:0,exploration:0,magic:0},seenEndingIds:[],acquiredBadgeIds:[],acquiredPuzzlePieceIds:[],unlockedRoomBackgroundIds:['ROOM_DEFAULT'],playedCharacterIds:[]},statistics:{},pendingCharacterUnlockIds:[],settings:{activePetId:'PET01',activeRoomBackgroundId:'ROOM_DEFAULT'}});
 const withoutText=structuredClone(slot);delete withoutText.activeRun.dialogueHistory[0].selectedChoices[0].text;withoutText.serverRevision=4;
 applyServerSlot(profile,withoutText);
 assert.equal(profile.slots[0].activeRun.dialogueHistory[0].selectedChoices[0].text,'기존 선택 문구');
});

test('engine weekly choices map to backend activity ids and forced-rest weekdays become null',()=>{
 const planned=projectServerRun({...run,day:'MONDAY',phase:'SCHEDULE_READY',forcedRest:{active:true,remainingWeekdays:2}});
 assert.deepEqual(serverScheduleActivityIds(planned,['rest','rest','rune-circuit','adventure','fairy-trade'],[null,null,null,'observatory',null]),[null,null,'rune-circuit','ADV_OBSERVATORY','fairy-trade']);
});

test('all six server class checkpoints restore their approved engine locations',()=>{
 for(const lesson of CLASSES){
  const schedule={
   MONDAY:{type:'CLASS',contentId:lesson.id,status:'IN_PROGRESS',staminaBefore:100,staminaCost:10,playDifficulty:'NORMAL',rewardDifficulty:'HARD',assistLevel:1,seed:`seed-${lesson.id}`,maxDurationMs:lesson.durationMs,replayVersion:'CLASS_INPUT_LOG_V1'},
   TUESDAY:{type:'REST',contentId:'REST_DEFAULT',status:'PLANNED'},
   WEDNESDAY:{type:'REST',contentId:'REST_DEFAULT',status:'PLANNED'},
   THURSDAY:{type:'REST',contentId:'REST_DEFAULT',status:'PLANNED'},
   FRIDAY:{type:'REST',contentId:'REST_DEFAULT',status:'PLANNED'},
  };
  const projected=projectServerRun({...run,day:'MONDAY',phase:'ACTIVITY_IN_PROGRESS',pendingStoryEvent:null,weeklySchedule:schedule});
  assert.equal(projected.inProgressActivity.serverStart.locationId,lesson.locationId,lesson.id);
  assert.deepEqual(serverClassStartData(projected.inProgressActivity,lesson),{
   gameId:lesson.id,locationId:lesson.locationId,difficulty:2,seed:`seed-${lesson.id}`,maxDurationMs:lesson.durationMs,rewardInputs:null,contractVersion:2,locationCode:lesson.locationCode,targetStat:lesson.stat,rewardDifficulty:'HARD',playDifficulty:'NORMAL',assistLevel:1,
  });
 }
});

test('engine room ids map to stable backend room ids',()=>{
 assert.equal(serverRoomBackgroundId('default'),'ROOM_DEFAULT');assert.equal(serverRoomBackgroundId('room-3'),'ROOM_03');assert.throws(()=>serverRoomBackgroundId('missing'));
});

test('My Room weekly accounting only opens in server phases where the room is actually usable',()=>{
 const ready=projectServerRun({...run,week:4,day:'MONDAY',phase:'SCHEDULE_READY',pendingStoryEvent:null,weeklySchedule:{}});assert.equal(serverRoomVisitKey(ready),'run-1:4');assert.equal(canRecordServerRoomVisit(ready),true);
 assert.equal(canRecordServerRoomVisit({...ready,serverPhase:'ACTIVITY_IN_PROGRESS'}),false);assert.equal(canRecordServerRoomVisit({...ready,pendingStoryEvent:{eventId:'MS02'}}),false);
});

test('all resumable server ending phases route back to the ending UI',()=>{
 assert.equal(isServerEndingPhase('ENDING_PENDING'),true);
 assert.equal(isServerEndingPhase('ENDING_DECIDED'),true);
 assert.equal(isServerEndingPhase('ENDING_READY'),true);
 assert.equal(isServerEndingPhase('FINAL_SUMMARY_PENDING'),false);
 assert.equal(isServerEndingPhase('SCHEDULE_READY'),false);
});
