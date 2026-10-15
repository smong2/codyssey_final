import {classOf,validAction} from './classes.mjs';
import {difficultyForStat,growthForResult,MINIGAME_OUTCOMES} from './minigame-contract.mjs';
import {currentAction,forcedRestRemaining,restOutcome} from './activity-rules.mjs';
import {createAdventureResult} from './adventure-contract.mjs';
export const CHARACTERS = [
{id:'CH01',name:'카엘',image:'kael1_base.png'},{id:'CH15',name:'로빈',image:'robin1_base.png'},
{id:'CH31',name:'니코',image:'nico1_base.png'},{id:'CH02',name:'세라',image:'sera1_base.png'},
{id:'CH08',name:'아이리스',image:'iris1_base.png'},{id:'CH16',name:'티아',image:'tia1_base.png'}];
// Latest main core-loop/stat rules; equal rest odds are an approved preview choice.
export const BALANCE=Object.freeze({classCost:10,adventureCost:15});
export function createProfile(){return {version:1,settings:{activePetId:'PET01'},meta:{unlockedPetIds:['PET01'],unlockedCharacters:CHARACTERS.map(c=>c.id),badges:[],pets:[],roomPieces:[],seenEndings:[],permanentBonuses:{},counters:{minigames:0,classes:0,adventures:0}},slots:Array.from({length:5},(_,i)=>({slotId:i+1,status:'EMPTY',completedRunCount:0,activeRun:null,lastSavedAt:null}))};}
function slotOf(p,id){const s=p.slots.find(s=>s.slotId===id);if(!s)throw new Error('저장 슬롯이 없습니다.');return s;}
function runOf(p,id){const r=slotOf(p,id).activeRun;if(!r)throw new Error('진행 중인 회차가 없습니다.');return r;}
export function startRun(p,id,characterId){
 const s=slotOf(p,id);if(s.status==='PLAYING')throw new Error('진행 중인 슬롯입니다.');
 if(!CHARACTERS.some(c=>c.id===characterId)||!p.meta.unlockedCharacters.includes(characterId))throw new Error('선택할 수 없는 캐릭터입니다.');
 s.status='PLAYING';s.activeRun={runNumber:s.completedRunCount+1,characterId,week:1,day:0,phase:'PLANNING',schedule:[],stamina:100,exhausted:false,forcedRestDays:0,stats:{knowledge:50,expression:50,dexterity:50,exploration:50,magic:50},hiddenStats:{},npcRelations:{},storyProgress:{},flags:{},lastAction:null};return s.activeRun;
}
export function setSchedule(p,id,actions){
 const r=runOf(p,id);if(r.phase!=='PLANNING'||r.day!==0)throw new Error('일정은 주 시작에만 등록합니다.');
 if(actions.length!==5||actions.some(a=>!validAction(a)))throw new Error('수업·모험·휴식으로 평일 5회 일정을 선택하세요.');
 r.schedule=[...actions];r.phase='ACTING';
}
export function actionToken(r){return `${r.runNumber}:${r.week}:${r.day}`;}
export function beginAction(p,id,token){
 const r=runOf(p,id);
 if(token===r.lastAction)return false;
 if(r.inProgressActivity){if(r.inProgressActivity.token===token)return false;throw new Error('다른 일정이 이미 진행 중입니다.');}
 if(r.phase!=='ACTING'||r.day>=5||token!==actionToken(r))throw new Error('현재 일정과 시작 요청이 일치하지 않습니다.');
 const forcedDays=forcedRestRemaining(r),forced=forcedDays>0,action=forced?'rest':r.schedule[r.day];
 const staminaBefore=r.stamina,lesson=classOf(action),cost=lesson?BALANCE.classCost:action==='adventure'?BALANCE.adventureCost:0;
 r.stamina=Math.max(0,r.stamina-cost);
 r.inProgressActivity={status:'IN_PROGRESS',token,action,staminaBefore,staminaCost:staminaBefore-r.stamina,
  forcedRest:forced,forcedRestDaysBefore:forcedDays,forcedRestDaysAfterStart:!forced&&r.stamina<10?3:0};
 return structuredClone(r.inProgressActivity);
}
export function applyAction(p,id,token,result,random=Math.random){
 const r=runOf(p,id);if(token===r.lastAction)return false;
 if(r.phase!=='ACTING'||r.day>=5||token!==actionToken(r))throw new Error('현재 일정과 결과가 일치하지 않습니다.');
 const checkpoint=r.inProgressActivity;if(!checkpoint||checkpoint.token!==token)throw new Error('활동 시작 체크포인트가 없습니다.');
 const forced=checkpoint.forcedRest,restDays=checkpoint.forcedRestDaysBefore;
 const action=checkpoint.action,staminaBefore=checkpoint.staminaBefore,growth={};
 let recovery;
 const lesson=classOf(action);let resolvedOutcome='complete';
 if(lesson){
  const normalized=result?.outcome==='quit'?{...result,outcome:'failure'}:result;
  if(normalized?.gameId!==lesson.id||normalized?.locationId!==lesson.locationId||normalized?.difficulty!==difficultyForStat(r.stats[lesson.stat])||
   !MINIGAME_OUTCOMES.includes(normalized?.outcome)||
   typeof normalized?.seed!=='string'||!Number.isFinite(normalized?.score)||!Number.isFinite(normalized?.durationMs)||
   !normalized?.metrics||typeof normalized.metrics!=='object'||Array.isArray(normalized.metrics)||!Object.hasOwn(normalized,'rewardInputs')||
   (normalized.rewardInputs!==null&&(typeof normalized.rewardInputs!=='object'||Array.isArray(normalized.rewardInputs))))
   throw new Error('공통 미니게임 결과 계약에 맞는 수업 결과가 필요합니다.');
  resolvedOutcome=normalized.outcome;
  const amount=growthForResult(normalized.outcome,normalized.difficulty,staminaBefore),before=r.stats[lesson.stat];
  r.stats[lesson.stat]=Math.min(500,before+amount);growth[lesson.stat]=r.stats[lesson.stat]-before;
  p.meta.counters.minigames++;p.meta.counters.classes++;
 }else if(action==='adventure'){
  if(result?.gameId!=='adventure')throw new Error('올바른 모험 결과가 필요합니다.');
  if(result.outcome==='complete'){
   // Legacy walk-only preview result; no mission data or growth is inferred.
  }else{
   if(!['MISSION_COMPLETE','TIMEOUT'].includes(result.outcome))throw new Error('비정상 중단은 재접속 복구에서만 처리합니다.');
   const resolved=createAdventureResult(result,result.outcome,{foundCount:result.foundCount,successGrowth:result.successGrowth,stamina:staminaBefore});
   if(resolved.difficulty!==difficultyForStat(r.stats.exploration))throw new Error('저장 탐험 스탯과 모험 난이도가 일치하지 않습니다.');
   resolvedOutcome=resolved.outcome==='MISSION_COMPLETE'?'success':'timeout';
   const before=r.stats.exploration,after=Math.min(500,before+resolved.explorationGrowth);
   r.stats.exploration=after;growth.exploration=after-before;
  }
  p.meta.counters.adventures++;
 }else{
  if(result!==undefined)throw new Error('휴식 일정에는 수업·모험 결과를 적용할 수 없습니다.');
  if(forced){r.forcedRestDays=restDays-1;if(r.forcedRestDays===0)r.stamina=100;}
  else{recovery=restOutcome(random).recovery;r.stamina=Math.min(100,r.stamina+recovery);}
 }
 if(!forced)r.forcedRestDays=checkpoint.forcedRestDaysAfterStart|| (r.stamina<10?3:0);
 r.exhausted=r.forcedRestDays>0;
 const effect={outcome:resolvedOutcome,staminaChange:r.stamina-staminaBefore,staminaAfter:r.stamina,growth,forcedRest:forced,forcedRestDays:r.forcedRestDays};
 if(recovery!==undefined)effect.restRecovery=recovery;
 (r.actionHistory??=[]).push({week:r.week,day:r.day,action,status:'COMPLETED',effect});
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
 (r.actionHistory??=[]).push({week:r.week,day:r.day,action:checkpoint.action,status:'INTERRUPTED',effect});
 r.lastAction=checkpoint.token;delete r.inProgressActivity;r.day++;if(r.day===5)r.phase='WEEK_COMPLETE';return true;
}
export function finishWeek(p,id){
 const r=runOf(p,id);if(r.phase!=='WEEK_COMPLETE')throw new Error('평일 5회 행동을 먼저 마쳐야 합니다.');
 if(r.week===52){r.phase='AWAITING_ENDING';return;}r.week++;r.day=0;r.schedule=[];r.phase='PLANNING';
}
export function deleteSlot(p,id){Object.assign(slotOf(p,id),{status:'EMPTY',activeRun:null,completedRunCount:0,lastSavedAt:null});}
