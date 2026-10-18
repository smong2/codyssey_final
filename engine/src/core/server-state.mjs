import {createProfile} from './state.mjs';
import {classOf} from './classes.mjs';
import {isForcedRestDay} from './activity-rules.mjs';

const WEEKDAYS=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'];
const ADVENTURE_LOCATIONS={ADV_GREENHOUSE:'greenhouse',ADV_LIBRARY:'library',ADV_OBSERVATORY:'observatory'};
const SERVER_ADVENTURE_IDS=Object.fromEntries(Object.entries(ADVENTURE_LOCATIONS).map(([server,engine])=>[engine,server]));
const SERVER_ROOMS={ROOM_DEFAULT:'default',ROOM_01:'room-1',ROOM_02:'room-2',ROOM_03:'room-3'};
const ENGINE_ROOMS=Object.fromEntries(Object.entries(SERVER_ROOMS).map(([server,engine])=>[engine,server]));
const SERVER_ROOM_VISIT_FORBIDDEN=new Set(['MAIN_STORY_PENDING','ACTIVITY_IN_PROGRESS','ACTIVITY_STORY_PENDING','ENDING_PENDING','ENDING_DECIDED','ENDING_READY','FINAL_SUMMARY_PENDING','WEEK_SUMMARY_PENDING']);
const clone=value=>value===undefined?undefined:structuredClone(value);
const statKey=key=>key==='skill'?'dexterity':key;
const projectStats=stats=>Object.fromEntries(Object.entries(stats??{}).filter(([key])=>['knowledge','expression','skill','exploration','magic'].includes(key)).map(([key,value])=>[statKey(key),value]));
const actionFor=entry=>{
 if(!entry||typeof entry!=='object')return null;
 if(entry.type==='CLASS')return entry.contentId??null;
 if(entry.type==='ADVENTURE')return 'adventure';
 if(entry.type==='REST'||entry.type==='FORCED_REST')return 'rest';
 if(entry.type==='SPECIAL')return entry.contentId??'fairy-trade';
 return null;
};
const locationFor=entry=>entry?.type==='ADVENTURE'?(ADVENTURE_LOCATIONS[entry.contentId]??null):null;
const localPhase=phase=>{
 if(['WEEKEND_PENDING'].includes(phase))return 'WEEK_COMPLETE';
 if(['ENDING_PENDING','ENDING_DECIDED','ENDING_READY','FINAL_SUMMARY_PENDING'].includes(phase))return 'AWAITING_ENDING';
 if(['SCHEDULE_CONFIRMED','ACTIVITY_READY','ACTIVITY_IN_PROGRESS','ACTIVITY_STORY_PENDING','MY_ROOM_RECOVERY'].includes(phase))return 'ACTING';
 return 'PLANNING';
};
const projectedHistory=(run,schedule)=>WEEKDAYS.flatMap((day,index)=>{
 const entry=schedule?.[day];if(!entry||entry.status!=='COMPLETED')return [];
 const action=actionFor(entry),growth={};
 const lesson=entry.type==='CLASS'?classOf(action):null;
 if(lesson&&typeof entry.growthApplied==='number')growth[lesson.stat]=entry.growthApplied;
 if(entry.type==='ADVENTURE'&&Number.isFinite(entry.growthAwarded?.exploration))growth.exploration=entry.growthAwarded.exploration;
 const staminaChange=(entry.staminaRecovered??0)-(entry.staminaCost??0);
 const staminaAfter=Number.isFinite(entry.staminaBefore)?Math.max(0,Math.min(100,entry.staminaBefore+staminaChange)):null;
 const transfer=entry.type==='SPECIAL'?entry.result?.transfer:null,transferChanges={};
 if(transfer&&typeof transfer.fromStat==='string'&&typeof transfer.toStat==='string'&&Number.isFinite(transfer.amount)){
  transferChanges[statKey(transfer.fromStat)]=-transfer.amount;transferChanges[statKey(transfer.toStat)]=transfer.amount;
 }
 return [{week:run.week,day:index,action,...(locationFor(entry)?{locationId:locationFor(entry)}:{}),status:entry.resolution==='INTERRUPTED'?'INTERRUPTED':'COMPLETED',effect:{outcome:String(entry.resolution??'complete').toLowerCase(),staminaChange,staminaAfter,growth,...(Object.keys(transferChanges).length?{transferChanges}:{}),forcedRest:entry.type==='FORCED_REST',forcedRestDays:run.forcedRest?.remainingWeekdays??0}}];
});

export function serverScheduleActivityIds(run,actions,locations=[]){
 if(!run||typeof run!=='object'||!Array.isArray(actions)||actions.length!==5)throw new Error('서버 주간 일정 입력이 올바르지 않습니다.');
 if(locations.length&&locations.length!==5)throw new Error('서버 모험 장소 일정이 올바르지 않습니다.');
 return actions.map((action,index)=>{
  if(isForcedRestDay(run,index))return null;
  if(classOf(action))return action;
  if(action==='rest')return 'REST_DEFAULT';
  if(action==='fairy-trade')return 'fairy-trade';
  if(action==='adventure'){
   const location=locations[index]??'greenhouse',activityId=SERVER_ADVENTURE_IDS[location];
   if(!activityId)throw new Error('서버에 등록되지 않은 모험 장소입니다.');
   return activityId;
  }
  throw new Error('서버에 등록되지 않은 활동입니다.');
 });
}

export function serverRoomBackgroundId(engineId){
 const id=ENGINE_ROOMS[engineId];if(!id)throw new Error('서버에 등록되지 않은 마이룸 배경입니다.');return id;
}

export function projectServerSettings(collection){
 const settings=collection?.settings??{},meta=collection?.meta??{},roomId=settings.activeRoomBackgroundId??'ROOM_DEFAULT',room=SERVER_ROOMS[roomId];
 if(typeof settings.activePetId!=='string'||!/^PET(?:0[1-9]|10)$/.test(settings.activePetId)||!room||!Array.isArray(meta.unlockedPetIds)||!meta.unlockedPetIds.includes(settings.activePetId)||!Array.isArray(meta.unlockedRoomBackgroundIds)||!meta.unlockedRoomBackgroundIds.includes(roomId))throw new Error('서버 계정 설정이 올바르지 않습니다.');
 return {activePetId:settings.activePetId,activeRoomBackgroundId:room};
}

function projectServerRooms(meta){
 const pieces=Array.isArray(meta.acquiredPuzzlePieceIds)?meta.acquiredPuzzlePieceIds:[],unlocked=new Set(meta.unlockedRoomBackgroundIds??[]);
 if(pieces.some(id=>typeof id!=='string'||!/^PUZZLE_ROOM_0[1-3]_(?:0[1-9]|1[0-2])$/.test(id))||[...unlocked].some(id=>!Object.hasOwn(SERVER_ROOMS,id)))throw new Error('서버 마이룸 수집 정보가 올바르지 않습니다.');
 return Object.entries(SERVER_ROOMS).filter(([serverId])=>serverId!=='ROOM_DEFAULT').map(([serverId,engineId])=>{
  const prefix=`PUZZLE_${serverId}_`,owned=pieces.filter(id=>typeof id==='string'&&id.startsWith(prefix)).map(id=>Number(id.slice(prefix.length))-1).filter(index=>Number.isInteger(index)&&index>=0&&index<12);
  return {id:engineId,pieces:[...new Set(owned)].sort((a,b)=>a-b),unlocked:unlocked.has(serverId),images:null};
 });
}

export function serverRoomVisitKey(run){
 return typeof run?.runId==='string'&&run.runId&&Number.isInteger(run.week)&&run.week>=1&&run.week<=52?`${run.runId}:${run.week}`:null;
}

export function canRecordServerRoomVisit(run){
 return Boolean(serverRoomVisitKey(run)&&!run.pendingStoryEvent&&!SERVER_ROOM_VISIT_FORBIDDEN.has(run.serverPhase));
}

function inProgressActivity(run,schedule,dayIndex){
 const day=WEEKDAYS[dayIndex],entry=schedule?.[day];if(!entry||entry.status!=='IN_PROGRESS')return undefined;
 const action=actionFor(entry);return {status:'IN_PROGRESS',token:`${run.runId}:${run.week}:${day}`,action,...(locationFor(entry)?{locationId:locationFor(entry)}:{}),staminaBefore:entry.staminaBefore,staminaCost:entry.staminaCost??0,forcedRest:entry.type==='FORCED_REST',forcedRestDaysBefore:run.forcedRest?.remainingWeekdays??0,forcedRestDaysAfterStart:run.forcedRest?.remainingWeekdays??0,
  ...(entry.playDifficulty?{playDifficulty:entry.playDifficulty}:{}),...(entry.rewardDifficulty?{rewardDifficulty:entry.rewardDifficulty}:{}),...(Number.isInteger(entry.assistLevel)?{assistLevel:entry.assistLevel}:{}),
  serverStart:{activityId:entry.contentId,activityType:entry.type,gameId:entry.type==='CLASS'?entry.contentId:null,locationId:locationFor(entry),seed:entry.seed??entry.adventureSeed,maxDurationMs:entry.maxDurationMs,replayVersion:entry.replayVersion,rewardDifficulty:entry.rewardDifficulty,playDifficulty:entry.playDifficulty,assistLevel:entry.assistLevel,adventureDifficulty:entry.adventureDifficulty,targetCount:entry.objectiveCount,durationSeconds:entry.durationSeconds,missionId:entry.missionId}};
}

export function projectServerRun(run){
 if(!run||typeof run!=='object')return null;
 const schedule=run.weeklySchedule&&typeof run.weeklySchedule==='object'?run.weeklySchedule:{},dayIndex=Math.max(0,WEEKDAYS.indexOf(run.day));
 const hasSchedule=WEEKDAYS.every(day=>schedule[day]&&typeof schedule[day]==='object');
 const actions=hasSchedule?WEEKDAYS.map(day=>actionFor(schedule[day])):[],locations=hasSchedule?WEEKDAYS.map(day=>locationFor(schedule[day])):[];
 const finalSummary=run.phase==='FINAL_SUMMARY_PENDING',summaryPending=['WEEK_SUMMARY_PENDING','FINAL_SUMMARY_PENDING'].includes(run.phase);
 const result={runId:run.runId,runNumber:run.runNumber,characterId:run.characterId,week:run.week,day:dayIndex,phase:localPhase(run.phase),serverPhase:run.phase,schedule:actions,scheduleLocations:locations,stamina:run.stamina?.current??0,exhausted:Boolean(run.forcedRest?.active),forcedRestDays:run.forcedRest?.remainingWeekdays??0,stats:projectStats(run.stats),consecutiveFails:clone(run.minigameFailStreaks??{}),pendingStoryEvent:clone(run.pendingStoryEvent??null),storyCast:clone(run.storyCast??{}),actionHistory:projectedHistory(run,schedule),lastWeekSummary:clone(run.lastWeekSummary??null),serverRunStatistics:clone(run.runStatistics??{}),endingDecision:clone(run.endingDecision),endingPrepared:clone(run.endingPrepared)};
 const progress=inProgressActivity(run,schedule,dayIndex);if(progress)result.inProgressActivity=progress;
 if(summaryPending)result.pendingWeekSummaryWeek=run.lastWeekSummary?.week??(finalSummary?52:Math.max(1,run.week-1));
 return result;
}

export function projectServerSlot(slot){
 if(!slot||typeof slot!=='object'||!Number.isInteger(slot.slotId))throw new Error('서버 저장 슬롯 형식이 올바르지 않습니다.');
 if(slot.status==='LOAD_ERROR')return {slotId:slot.slotId,status:'LOAD_ERROR',completedRunCount:0,activeRun:null,lastSavedAt:null,serverRevision:null};
 return {slotId:slot.slotId,status:slot.status,completedRunCount:slot.completedRunCount??0,activeRun:slot.status==='PLAYING'?projectServerRun(slot.activeRun):null,lastSavedAt:slot.lastSavedAt??null,serverRevision:slot.serverRevision,gameDataVersion:slot.gameDataVersion,lastCompletedCharacterId:slot.lastCompletedCharacterId??null,lastEndingId:slot.lastEndingId??null};
}

export function projectServerCollection(collection){
 const meta=collection?.meta??{},statistics=collection?.statistics??{},base=createProfile().meta;
 return {...base,unlockedCharacters:clone(meta.unlockedCharacterIds??base.unlockedCharacters),unlockedPetIds:clone(meta.unlockedPetIds??base.unlockedPetIds),permanentBonuses:projectStats(meta.permanentBonuses??{}),seenEndings:clone(meta.seenEndingIds??[]),badges:clone(meta.acquiredBadgeIds??[]),roomPieces:clone(meta.acquiredPuzzlePieceIds??[]),endingViewCounts:clone(statistics.endingViewCounts??{}),collectionView:{...(base.collectionView??{}),rooms:projectServerRooms(meta)},counters:{minigames:statistics.totalMinigamePlayCount??0,classes:statistics.totalClassCount??0,adventures:statistics.totalAdventureCount??0},serverCollection:{pendingCharacterUnlockIds:clone(collection?.pendingCharacterUnlockIds??[]),unlockedRoomBackgroundIds:clone(meta.unlockedRoomBackgroundIds??[]),playedCharacterIds:clone(meta.playedCharacterIds??[])}};
}

export function createServerProfile(slots,collection=null){
 if(!Array.isArray(slots)||slots.length!==5)throw new Error('서버 저장 슬롯 5개가 필요합니다.');
 const profile=createProfile();profile.meta=projectServerCollection(collection);profile.settings=projectServerSettings(collection);profile.slots=slots.map(projectServerSlot);profile.serverBacked=true;return profile;
}

export function applyServerCollection(profile,collection){
 if(!profile)throw new Error('서버 프로필이 없습니다.');profile.meta=projectServerCollection(collection);profile.settings=projectServerSettings(collection);return profile;
}

export function applyServerActiveRun(profile,slotId,activeRun,serverRevision){
 const slot=profile?.slots?.find(item=>item.slotId===slotId);if(!slot)throw new Error('서버 상태를 적용할 저장 슬롯이 없습니다.');
 if(!Number.isInteger(serverRevision)||serverRevision<0)throw new Error('서버 revision이 올바르지 않습니다.');
 slot.status='PLAYING';slot.serverRevision=serverRevision;slot.activeRun=projectServerRun(activeRun);return slot.activeRun;
}
