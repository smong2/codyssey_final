import {createProfile,CHARACTERS} from './state.mjs';
import {validAction} from './classes.mjs';
import {unlockedPetIds} from './pets.mjs';
import {validActivityEffect} from './activity-rules.mjs';
import {classOf} from './classes.mjs';
import {isAdventureLocation} from './adventure-mission.mjs';
import {validateStoryState} from './story-events.mjs';
import {validateGrowthRewardConfig} from './minigame-contract.mjs';
import {MAIN_STORIES} from './main-story.mjs';
import {roomProgress} from './collection-view.mjs';
import {validateNarrativeState} from './narrative.mjs';
import {validateEndingView} from './ending-frame.mjs';
export const STORAGE_KEY='lumia.engine.dev.v1';
export function createBoundaryWriter(repository){
 let pending=null,source=null,savedSlotId=null;
 function retry(){
  if(!pending)return;
  repository.save(pending);
  if(savedSlotId!==null){source.meta.lastSavedSlotId=savedSlotId;source.slots[savedSlotId-1].lastSavedAt=pending.slots[savedSlotId-1].lastSavedAt;}
  pending=null;source=null;savedSlotId=null;
 }
 return {save(profile,slotId=null){
  pending=structuredClone(profile);source=profile;savedSlotId=Number.isInteger(slotId)&&pending.slots[slotId-1]&&pending.slots[slotId-1].status!=='EMPTY'?slotId:null;
  if(savedSlotId!==null){pending.meta.lastSavedSlotId=savedSlotId;pending.slots[savedSlotId-1].lastSavedAt=new Date().toISOString();}
  retry();
 },retry};
}
export function validateProfile(p){
 if(p?.version!==1||!p.meta||!Array.isArray(p.meta.unlockedCharacters)||!Array.isArray(p.meta.badges)||!p.meta.counters||!Array.isArray(p.slots)||p.slots.length!==5)throw new Error('지원하지 않거나 손상된 저장 데이터입니다. 원본을 보존했습니다.');
 for(const key of ['minigames','classes','adventures'])if(!Number.isSafeInteger(p.meta.counters[key])||p.meta.counters[key]<0)throw new Error('누적 기록이 손상됐습니다.');
 if(p.meta.endingViewCounts!==undefined&&(!p.meta.endingViewCounts||typeof p.meta.endingViewCounts!=='object'||Array.isArray(p.meta.endingViewCounts)||Object.values(p.meta.endingViewCounts).some(value=>!Number.isSafeInteger(value)||value<0)))throw new Error('엔딩 열람 기록이 손상됐습니다.');
 if(p.config!==undefined&&(!p.config||typeof p.config!=='object'||Array.isArray(p.config)))throw new Error('전역 엔진 설정이 손상됐습니다.');
 if(p.config?.growthRewardConfig)validateGrowthRewardConfig(p.config.growthRewardConfig);
 if(p.meta.growthRewardConfig)validateGrowthRewardConfig(p.meta.growthRewardConfig);
 p.slots.forEach((s,i)=>{
  if(s.slotId!==i+1||!['EMPTY','PLAYING','RUN_COMPLETE'].includes(s.status)||!Number.isInteger(s.completedRunCount)||s.completedRunCount<0)throw new Error('슬롯 데이터가 손상됐습니다.');
  const r=s.activeRun;
  if(s.status==='PLAYING'&&(!r||!Number.isInteger(r.week)||r.week<1||r.week>52||!Number.isInteger(r.day)||r.day<0||r.day>5||!['PLANNING','ACTING','WEEK_COMPLETE','AWAITING_ENDING'].includes(r.phase)||!Array.isArray(r.schedule)||!r.stats||!Number.isFinite(r.stamina)||r.stamina<0||r.stamina>100))throw new Error('회차 데이터가 손상됐습니다.');
  if(s.status!=='PLAYING'&&r!==null)throw new Error('슬롯 상태가 회차와 일치하지 않습니다.');
  if(s.status==='PLAYING'){
   if(r.narrativeState!==undefined)validateNarrativeState(r.narrativeState,r);
   if(r.endingRecord&&(!Number.isInteger(r.endingRecord.runNumber)||r.endingRecord.runNumber!==r.runNumber||!['CAREER','FALLBACK'].includes(r.endingRecord.type)||typeof r.endingRecord.careerId!=='string'||typeof r.endingRecord.careerName!=='string'||!Array.isArray(r.endingRecord.records)||!['pending','ready','failed'].includes(r.endingRecord.letter?.status)||r.phase!=='AWAITING_ENDING'))throw new Error('엔딩 준비 기록이 손상됐습니다.');
   if(r.endingRecord)validateEndingView({slotId:s.slotId,runNumber:r.runNumber,career:{id:r.endingRecord.careerId,name:r.endingRecord.careerName},letter:r.endingRecord.letter,...(r.endingRecord.playRecords?{playRecords:r.endingRecord.playRecords}:{}),...(r.endingRecord.newUnlocks?{newUnlocks:r.endingRecord.newUnlocks}:{})},{slotId:s.slotId,runNumber:r.runNumber});
    if(r.storyState!==undefined){
     validateStoryState(r.storyState);
     const events=[...r.storyState.history,...(r.storyState.pending?[r.storyState.pending]:[])];
     if(events.some(e=>e.week>r.week||e.npcId===r.characterId||!(r.actionHistory??[]).some(h=>h.status==='COMPLETED'&&h.action==='adventure'&&h.week===e.week&&h.day===e.day&&(h.locationId??'greenhouse')===e.locationId))||
      r.storyState.pending&&(r.inProgressActivity||r.storyState.pending.week!==r.week))throw new Error('이야기 기록이 실제 완료 활동과 일치하지 않습니다.');
    }
   if(r.mainStory!==undefined){
    const state=r.mainStory,ids=MAIN_STORIES.map(story=>story.id),completed=state?.completedIds;
    if(!state||!Array.isArray(completed)||new Set(completed).size!==completed.length||completed.some(id=>!ids.includes(id))||state.pendingId!==null&&!ids.includes(state.pendingId)||!Array.isArray(state.history)||state.history.some(item=>!ids.includes(item.id)||!completed.includes(item.id)||!Number.isInteger(item.week)||item.week<1||item.week>r.week||item.effect?.growth&&Object.entries(item.effect.growth).some(([stat,value])=>!['knowledge','expression','dexterity','exploration','magic'].includes(stat)||!Number.isFinite(value)||value<0||value>500)))throw new Error('메인 스토리 진행 기록이 손상됐습니다.');
   }
   if(r.consecutiveFails!==undefined&&(!r.consecutiveFails||typeof r.consecutiveFails!=='object'||Array.isArray(r.consecutiveFails)||Object.values(r.consecutiveFails).some(count=>!Number.isSafeInteger(count)||count<0)))throw new Error('연속 실패 기록이 손상됐습니다.');
   if(r.actionHistory!==undefined){
    const seen=new Set();
    if(!Array.isArray(r.actionHistory)||r.actionHistory.length>260||r.actionHistory.some(h=>{
     if(!h||!Number.isInteger(h.week)||h.week<1||h.week>r.week||!Number.isInteger(h.day)||h.day<0||h.day>4||!validAction(h.action)||h.locationId!==undefined&&(h.action!=='adventure'||!isAdventureLocation(h.locationId))||h.week===r.week&&h.day>=r.day||h.status!==undefined&&!['COMPLETED','INTERRUPTED'].includes(h.status)||h.status==='INTERRUPTED'&&h.effect?.outcome!=='interrupted'||h.status==='COMPLETED'&&h.effect?.outcome==='interrupted'||h.effect!==undefined&&!validActivityEffect(h.effect))return true;
     const key=h.week+':'+h.day;if(seen.has(key))return true;seen.add(key);return false;
    }))throw new Error('지난 일정 기록이 손상됐습니다. 원본을 보존했습니다.');
   }
   const validCharacter=CHARACTERS.some(c=>c.id===r.characterId)&&p.meta.unlockedCharacters.includes(r.characterId);
   const validStats=['knowledge','expression','dexterity','exploration','magic'].every(k=>Number.isFinite(r.stats[k])&&r.stats[k]>=0&&r.stats[k]<=500);
   const validRest=r.forcedRestDays===undefined||Number.isInteger(r.forcedRestDays)&&r.forcedRestDays>=0&&r.forcedRestDays<=3&&r.exhausted===(r.forcedRestDays>0);
   const pending=r.inProgressActivity;
   const expectedRestDays=pending?(r.forcedRestDays??(r.exhausted||pending.staminaBefore<10?3:0)):0;
   const expectedForced=expectedRestDays>0;
   const scheduledAction=expectedForced?'rest':r.schedule[r.day];
   const expectedCost=expectedForced?0:classOf(scheduledAction)?10:scheduledAction==='adventure'?15:0;
   const expectedStaminaAfter=pending?Math.max(0,pending.staminaBefore-expectedCost):null;
   const expectedQueuedRest= pending&&!expectedForced&&expectedStaminaAfter<10?3:0;
   const locations=r.scheduleLocations;
   const validLocations=locations===undefined||Array.isArray(locations)&&locations.length===r.schedule.length&&locations.every((location,index)=>r.schedule[index]==='adventure'?isAdventureLocation(location):location===null);
   const pendingLocation=pending?.action==='adventure'?(locations?.[r.day]??'greenhouse'):null;
   const validPending=pending===undefined||!!pending&&r.phase==='ACTING'&&r.day<5&&pending.status==='IN_PROGRESS'&&pending.token===`${r.runNumber}:${r.week}:${r.day}`&&validAction(pending.action)&&pending.action===scheduledAction&&(pending.action!=='adventure'||(pending.locationId===undefined?pendingLocation==='greenhouse':pending.locationId===pendingLocation))&&Number.isFinite(pending.staminaBefore)&&pending.staminaBefore>=0&&pending.staminaBefore<=100&&Number.isFinite(pending.staminaCost)&&pending.staminaCost===pending.staminaBefore-expectedStaminaAfter&&pending.staminaCost<=15&&pending.staminaBefore-pending.staminaCost===r.stamina&&pending.forcedRest===expectedForced&&pending.forcedRestDaysBefore===expectedRestDays&&pending.forcedRestDaysAfterStart===expectedQueuedRest;
   const validPlan=r.phase==='PLANNING'?r.day===0&&r.schedule.length===0&&(!locations||locations.length===0)&&!pending:
    r.schedule.length===5&&r.schedule.every(validAction)&&r.schedule.filter(action=>action==='fairy-trade').length<=1&&validLocations&&(r.phase==='ACTING'?r.day<5:r.day===5);
   const summaryWeek=r.pendingWeekSummaryWeek;
   const validSummary=summaryWeek===undefined||Number.isInteger(summaryWeek)&&summaryWeek>=1&&summaryWeek<=52&&
    (r.phase==='PLANNING'&&summaryWeek===r.week-1||r.phase==='AWAITING_ENDING'&&r.week===52&&summaryWeek===52)&&!pending;
   if(!validCharacter||!validStats||!validRest||!validPlan||!validPending||!validSummary||!Number.isInteger(r.runNumber)||r.runNumber!==s.completedRunCount+1||typeof r.exhausted!=='boolean'||r.phase==='AWAITING_ENDING'&&r.week!==52)throw new Error('캐릭터·스탯·일정 데이터가 손상됐습니다.');
  }
 });return p;
}
// Replace the repository adapter with an account API later.
export function createLocalRepository(storage){return {
 load(){const raw=storage.getItem(STORAGE_KEY);return raw===null?createProfile():validateProfile(JSON.parse(raw));},
 save(profile){validateProfile(profile);storage.setItem(STORAGE_KEY,JSON.stringify(profile));},
 saveSettings(settings){
  const raw=storage.getItem(STORAGE_KEY),saved=raw===null?createProfile():validateProfile(JSON.parse(raw));
  if(!settings||Object.keys(settings).some(key=>!['activePetId','activeRoomBackgroundId'].includes(key)))throw new Error('지원하지 않는 설정입니다.');
  if(Object.hasOwn(settings,'activePetId')&&!unlockedPetIds(saved.meta).includes(settings.activePetId))throw new Error('해금되지 않은 펫은 선택할 수 없습니다.');
  if(Object.hasOwn(settings,'activeRoomBackgroundId')){const room=roomProgress(saved.meta,settings.activeRoomBackgroundId);if(!room.unlocked||!room.images)throw new Error('사용할 수 없는 마이룸 배경입니다.');}
  saved.settings={...(saved.settings??{}),...settings};
  storage.setItem(STORAGE_KEY,JSON.stringify(saved));
 }
};}
