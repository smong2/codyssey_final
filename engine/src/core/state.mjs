import {classOf,validAction,LEGACY_CLASSES} from './classes.mjs';
import {difficultyForStat,playDifficultyFor,growthForResult,MINIGAME_OUTCOMES,validateGrowthRewardConfig} from './minigame-contract.mjs';
import {currentAction,forcedRestRemaining,restOutcome} from './activity-rules.mjs';
import {createAdventureResult} from './adventure-contract.mjs';
import {isAdventureLocation} from './adventure-mission.mjs';
import {completeMainStory} from './main-story.mjs';
import {selectCareerEnding} from './ending-system.mjs';
import {normalizeCurriculumResult} from './curriculum.mjs';
import {STUDENTS} from './catalogue.mjs';
import {startingStats,startingHiddenStats} from './character-start.mjs';
import {validateEndingView} from './ending-frame.mjs';
export const CHARACTERS=STUDENTS;
// Latest main core-loop/stat rules; equal rest odds are an approved preview choice.
export const BALANCE=Object.freeze({classCost:10,adventureCost:15});
export function createProfile(){return {version:1,settings:{activePetId:'PET01'},config:{growthRewardConfig:null},meta:{unlockedPetIds:['PET01'],unlockedCharacters:CHARACTERS.filter(c=>c.basic).map(c=>c.id),badges:[],pets:[],roomPieces:[],seenEndings:[],endingViewCounts:{},endingRecords:[],permanentBonuses:{},counters:{minigames:0,classes:0,adventures:0}},slots:Array.from({length:5},(_,i)=>({slotId:i+1,status:'EMPTY',completedRunCount:0,activeRun:null,lastSavedAt:null}))};}
function slotOf(p,id){const s=p.slots.find(s=>s.slotId===id);if(!s)throw new Error('저장 슬롯이 없습니다.');return s;}
function runOf(p,id){const r=slotOf(p,id).activeRun;if(!r)throw new Error('진행 중인 회차가 없습니다.');return r;}
export function startRun(p,id,characterId){
 const s=slotOf(p,id);if(s.status==='PLAYING')throw new Error('진행 중인 슬롯입니다.');
 if(!CHARACTERS.some(c=>c.id===characterId)||!p.meta.unlockedCharacters.includes(characterId))throw new Error('선택할 수 없는 캐릭터입니다.');
 const stats=startingStats(characterId,p.meta.permanentBonuses??{});
 s.status='PLAYING';s.activeRun={runNumber:s.completedRunCount+1,characterId,week:1,day:0,phase:'PLANNING',schedule:[],scheduleLocations:[],stamina:100,exhausted:false,forcedRestDays:0,stats,hiddenStats:startingHiddenStats(),npcRelations:{},storyProgress:{},flags:{},consecutiveFails:{},mainStory:{completedIds:[],pendingId:'MS01',history:[]},lastAction:null};return s.activeRun;
}
export function setSchedule(p,id,actions,locations=[]){
 const r=runOf(p,id);if(r.pendingWeekSummaryWeek!==undefined)throw new Error('지난주 요약을 먼저 확인해 주세요.');if(r.phase!=='PLANNING'||r.day!==0)throw new Error('일정은 주 시작에만 등록합니다.');
 if(actions.length!==5||actions.some(a=>!validAction(a)))throw new Error('수업·모험·휴식·요정의 거래로 평일 5회 일정을 선택하세요.');
 if(actions.filter(a=>a==='fairy-trade').length>1)throw new Error('요정의 거래는 주 1회만 등록할 수 있습니다.');
 if(locations.length&&locations.length!==5)throw new Error('모험 장소 일정이 올바르지 않습니다.');
 const scheduleLocations=actions.map((action,index)=>{
  if(action!=='adventure')return null;
  const location=locations[index]??'greenhouse';if(!isAdventureLocation(location))throw new Error('등록되지 않은 모험 장소입니다.');return location;
 });r.schedule=[...actions];r.scheduleLocations=scheduleLocations;r.phase='ACTING';
}
export function actionToken(r){return `${r.runNumber}:${r.week}:${r.day}`;}
export function setGrowthRewardConfig(profile,config){profile.config??={};profile.config.growthRewardConfig=validateGrowthRewardConfig(config);return structuredClone(profile.config.growthRewardConfig);}
export function beginAction(p,id,token){
 const r=runOf(p,id);
 if(r.pendingWeekSummaryWeek!==undefined)throw new Error('지난주 요약을 먼저 확인해 주세요.');
 if(token===r.lastAction)return false;
 if(r.storyState?.pending||r.narrativeState?.pending)throw new Error('진행 중인 이야기를 먼저 마쳐 주세요.');
 if(r.inProgressActivity){if(r.inProgressActivity.token===token)return false;throw new Error('다른 일정이 이미 진행 중입니다.');}
 if(r.phase!=='ACTING'||r.day>=5||token!==actionToken(r))throw new Error('현재 일정과 시작 요청이 일치하지 않습니다.');
 const forcedDays=forcedRestRemaining(r),forced=forcedDays>0,action=forced?'rest':r.schedule[r.day];
 const staminaBefore=r.stamina,lesson=classOf(action),cost=lesson?BALANCE.classCost:action==='adventure'?BALANCE.adventureCost:0;
 r.stamina=Math.max(0,r.stamina-cost);
 const rewardDifficulty=lesson?difficultyForStat(r.stats[lesson.stat]):null;
 const failCount=lesson?(r.consecutiveFails?.[lesson.id]??0):0;
 r.inProgressActivity={status:'IN_PROGRESS',token,action,...(action==='adventure'?{locationId:r.scheduleLocations?.[r.day]??'greenhouse'}:{}),staminaBefore,staminaCost:staminaBefore-r.stamina,
  ...(lesson?{playDifficulty:playDifficultyFor(rewardDifficulty,failCount),rewardDifficulty,assistLevel:Math.min(2,Math.floor(failCount/2))}:{}),
  forcedRest:forced,forcedRestDaysBefore:forcedDays,forcedRestDaysAfterStart:!forced&&r.stamina<10?3:0};
 return structuredClone(r.inProgressActivity);
}
export function applyAction(p,id,token,result,random=Math.random){
 const r=runOf(p,id);if(token===r.lastAction)return false;
 if(r.phase!=='ACTING'||r.day>=5||token!==actionToken(r))throw new Error('현재 일정과 결과가 일치하지 않습니다.');
 const checkpoint=r.inProgressActivity;if(!checkpoint||checkpoint.token!==token)throw new Error('활동 시작 체크포인트가 없습니다.');
 const forced=checkpoint.forcedRest,restDays=checkpoint.forcedRestDaysBefore;
 const action=checkpoint.action,staminaBefore=checkpoint.staminaBefore,growth={},transferChanges={};
 let recovery;
 const lesson=classOf(action);let resolvedOutcome='complete';
 if(lesson){
  if(lesson.curriculum&&!LEGACY_CLASSES.some(c=>c.id===lesson.id)&&result?.contractVersion!==2)throw new Error('본편 수업에는 버전 2 결과 계약이 필요합니다.');
  const normalized=result?.contractVersion===2?normalizeCurriculumResult(result,lesson,checkpoint):result?.outcome==='quit'?{...result,outcome:'failure'}:result;
  if(normalized?.gameId!==lesson.id||normalized?.locationId!==lesson.locationId||normalized?.difficulty!==(checkpoint.playDifficulty??difficultyForStat(r.stats[lesson.stat]))||(normalized.rewardDifficulty!==undefined&&normalized.rewardDifficulty!==(checkpoint.rewardDifficulty??difficultyForStat(r.stats[lesson.stat])))||
   !MINIGAME_OUTCOMES.includes(normalized?.outcome)||
   typeof normalized?.seed!=='string'||!Number.isFinite(normalized?.score)||!Number.isFinite(normalized?.durationMs)||
   !normalized?.metrics||typeof normalized.metrics!=='object'||Array.isArray(normalized.metrics)||!Object.hasOwn(normalized,'rewardInputs')||
   (normalized.rewardInputs!==null&&(typeof normalized.rewardInputs!=='object'||Array.isArray(normalized.rewardInputs))))
   throw new Error('공통 미니게임 결과 계약에 맞는 수업 결과가 필요합니다.');
  resolvedOutcome=normalized.outcome;
  const multipliers=validateGrowthRewardConfig(p.config?.growthRewardConfig??p.meta.growthRewardConfig??{rewardMultiplier:{}}).rewardMultiplier;
  const amount=growthForResult(normalized.outcome,checkpoint.rewardDifficulty??normalized.rewardDifficulty??normalized.difficulty,staminaBefore,multipliers[lesson.stat]),before=r.stats[lesson.stat];
  r.stats[lesson.stat]=Math.min(500,before+amount);growth[lesson.stat]=r.stats[lesson.stat]-before;
  if(['failure','timeout'].includes(normalized.outcome)){const previous=r.consecutiveFails?.[lesson.id]??0;r.consecutiveFails={...(r.consecutiveFails??{}),[lesson.id]:previous+1};}else if(['success','greatSuccess'].includes(normalized.outcome)){r.consecutiveFails={...(r.consecutiveFails??{}),[lesson.id]:0};}
  p.meta.counters.minigames++;p.meta.counters.classes++;
 }else if(action==='adventure'){
  if(result?.gameId!=='adventure')throw new Error('올바른 모험 결과가 필요합니다.');
  if(result.outcome==='complete'){
   // Legacy walk-only preview result; no mission data or growth is inferred.
  }else{
   if(!['MISSION_COMPLETE','TIMEOUT'].includes(result.outcome))throw new Error('비정상 중단은 재접속 복구에서만 처리합니다.');
   const resolved=createAdventureResult(result,result.outcome,{foundCount:result.foundCount,successGrowth:result.successGrowth,stamina:staminaBefore});
    if(resolved.difficulty!==difficultyForStat(r.stats.exploration)||resolved.locationId!==(checkpoint.locationId??'greenhouse'))throw new Error('저장 탐험 스탯 또는 모험 장소가 시작 정보와 일치하지 않습니다.');
   resolvedOutcome=resolved.outcome==='MISSION_COMPLETE'?'success':'timeout';
   const multiplier=validateGrowthRewardConfig(p.config?.growthRewardConfig??p.meta.growthRewardConfig??{rewardMultiplier:{}}).rewardMultiplier.exploration;
   const adjustedGrowth=Math.floor(resolved.explorationGrowth*multiplier*(staminaBefore>=10&&staminaBefore<=30?.5:1));
   const before=r.stats.exploration,after=Math.min(500,before+adjustedGrowth);
   r.stats.exploration=after;growth.exploration=after-before;
  }
  p.meta.counters.adventures++;
 }else if(action==='fairy-trade'){
  if(result?.skip===true){if(Object.keys(result).some(key=>key!=='skip'))throw new Error('건너뛰기 결과에 다른 값이 포함되어 있습니다.');resolvedOutcome='skipped';}
  else{
   const transfer=result?.transfer,keys=['knowledge','expression','dexterity','exploration','magic'];
   if(!transfer||Object.keys(transfer).some(key=>!['from','to','amount'].includes(key))||!keys.includes(transfer.from)||!keys.includes(transfer.to)||transfer.from===transfer.to||!Number.isInteger(transfer.amount)||transfer.amount<1||transfer.amount>5||r.stats[transfer.from]<transfer.amount||r.stats[transfer.to]+transfer.amount>500)throw new Error('요정의 거래는 서로 다른 스탯 사이에서 1~5포인트만 교환할 수 있습니다.');
   r.stats[transfer.from]-=transfer.amount;r.stats[transfer.to]+=transfer.amount;transferChanges[transfer.from]=-transfer.amount;transferChanges[transfer.to]=transfer.amount;resolvedOutcome='transferred';
  }
 }else{
  if(result!==undefined)throw new Error('휴식 일정에는 수업·모험 결과를 적용할 수 없습니다.');
  if(forced){r.forcedRestDays=restDays-1;if(r.forcedRestDays===0)r.stamina=100;}
  else{recovery=restOutcome(random).recovery;r.stamina=Math.min(100,r.stamina+recovery);}
 }
 if(!forced)r.forcedRestDays=checkpoint.forcedRestDaysAfterStart|| (r.stamina<10?3:0);
 r.exhausted=r.forcedRestDays>0;
 const effect={outcome:resolvedOutcome,staminaChange:r.stamina-staminaBefore,staminaAfter:r.stamina,growth,forcedRest:forced,forcedRestDays:r.forcedRestDays};
 if(Object.keys(transferChanges).length)effect.transferChanges=transferChanges;
 if(recovery!==undefined)effect.restRecovery=recovery;
 (r.actionHistory??=[]).push({week:r.week,day:r.day,action,...(lesson?{stat:lesson.stat}:{}),...(action==='adventure'?{locationId:checkpoint.locationId??r.scheduleLocations?.[r.day]??'greenhouse'}:{}),status:'COMPLETED',effect});
 r.lastAction=token;delete r.inProgressActivity;r.day++;if(r.day===5)r.phase='WEEK_COMPLETE';return true;
}
export function recoverInterruptedAction(p,id){
 const r=runOf(p,id),checkpoint=r.inProgressActivity;
 if(!checkpoint)return false;
 if(r.phase!=='ACTING'||r.day>=5||checkpoint.token!==actionToken(r))throw new Error('중단된 활동 체크포인트가 현재 일정과 일치하지 않습니다.');
 if(!checkpoint.forcedRest&&checkpoint.forcedRestDaysAfterStart)r.forcedRestDays=checkpoint.forcedRestDaysAfterStart;
 r.exhausted=r.forcedRestDays>0;
 const effect={outcome:'interrupted',staminaChange:r.stamina-checkpoint.staminaBefore,staminaAfter:r.stamina,growth:{},
  forcedRest:checkpoint.forcedRest,forcedRestDays:r.forcedRestDays};
 (r.actionHistory??=[]).push({week:r.week,day:r.day,action:checkpoint.action,...(checkpoint.action==='adventure'?{locationId:checkpoint.locationId??'greenhouse'}:{}),status:'INTERRUPTED',effect});
 r.lastAction=checkpoint.token;delete r.inProgressActivity;r.day++;if(r.day===5)r.phase='WEEK_COMPLETE';return true;
}
export function finishWeek(p,id){
 const r=runOf(p,id);if(r.storyState?.pending||r.narrativeState?.pending)throw new Error('진행 중인 이야기를 먼저 마쳐 주세요.');
 if(r.pendingWeekSummaryWeek!==undefined)throw new Error('지난주 요약을 먼저 확인해 주세요.');
 if(r.phase!=='WEEK_COMPLETE')throw new Error('평일 5회 행동을 먼저 마쳐야 합니다.');
 r.pendingWeekSummaryWeek=r.week;
 if(r.week===52){r.phase='AWAITING_ENDING';return;}r.week++;r.day=0;r.schedule=[];r.scheduleLocations=[];r.phase='PLANNING';
}
export function acknowledgeWeekSummary(p,id){
 const r=runOf(p,id);if(!Number.isInteger(r.pendingWeekSummaryWeek))throw new Error('확인할 주간 요약이 없습니다.');
 const week=r.pendingWeekSummaryWeek;delete r.pendingWeekSummaryWeek;return week;
}
export function prepareEnding(p,id,random=Math.random){
 const run=runOf(p,id);if(run.phase!=='AWAITING_ENDING'||run.pendingWeekSummaryWeek!==undefined)throw new Error('마지막 주간 요약을 먼저 확인해야 합니다.');
 if(!run.endingRecord){const selected=selectCareerEnding(run,p.meta,random);run.endingRecord={runNumber:run.runNumber,careerId:selected.career.id,careerName:selected.career.name,type:selected.type,fit:selected.fit,checks:selected.checks,records:selected.records,preparedAt:new Date().toISOString(),letter:{status:'pending'}};}
 return structuredClone(run.endingRecord);
}
export function completeRun(p,id){
 const s=slotOf(p,id),run=s.activeRun;if(s.status!=='PLAYING'||!run||run.phase!=='AWAITING_ENDING'||!run.endingRecord||run.pendingWeekSummaryWeek!==undefined)throw new Error('엔딩 마지막 확인 단계가 아닙니다.');
 const ready=validateEndingView({slotId:id,runNumber:run.runNumber,career:{id:run.endingRecord.careerId,name:run.endingRecord.careerName},letter:run.endingRecord.letter},{slotId:id,runNumber:run.runNumber});
 if(ready.letter.status!=='ready')throw new Error('준비된 편지를 먼저 확인해 주세요.');
 const record={...structuredClone(run.endingRecord),characterId:run.characterId,completedAt:new Date().toISOString()};
 p.meta.endingRecords??=[];p.meta.seenEndings??=[];p.meta.endingViewCounts??={};p.meta.endingRecords.push(record);p.meta.endingViewCounts[record.careerId]=(p.meta.endingViewCounts[record.careerId]??0)+1;if(record.type==='CAREER'&&!p.meta.seenEndings.includes(record.careerId))p.meta.seenEndings.push(record.careerId);
 s.completedRunCount++;s.status='RUN_COMPLETE';s.activeRun=null;return structuredClone(record);
}
export function acceptEndingResult(p,id,value){
 const run=runOf(p,id),record=run.endingRecord;if(run.phase!=='AWAITING_ENDING'||!record)throw new Error('엔딩 결과를 받을 회차가 아닙니다.');
 const received=validateEndingView(value,{slotId:id,runNumber:run.runNumber});
 if(received.career.id!==record.careerId||received.career.name!==record.careerName)throw new Error('준비된 미래 직업과 다른 응답입니다.');
 if(record.letter.status==='ready')return structuredClone(record);
 record.letter=received.letter;
 if(received.playRecords)record.playRecords=received.playRecords;
 if(received.newUnlocks)record.newUnlocks=received.newUnlocks;
 if(received.career.careerAnchor)record.careerAnchor=received.career.careerAnchor;
 return structuredClone(record);
}
export {completeMainStory};
export function deleteSlot(p,id){Object.assign(slotOf(p,id),{status:'EMPTY',activeRun:null,completedRunCount:0,lastSavedAt:null});}
