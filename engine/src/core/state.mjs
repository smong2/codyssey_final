import {classOf,validAction} from './classes.mjs';
import {difficultyForStat,growthForResult,MINIGAME_OUTCOMES} from './minigame-contract.mjs';
import {currentAction,forcedRestRemaining,restOutcome} from './activity-rules.mjs';
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
export function applyAction(p,id,token,result,random=Math.random){
 const r=runOf(p,id);if(token===r.lastAction)return false;
 if(r.phase!=='ACTING'||r.day>=5||token!==actionToken(r))throw new Error('현재 일정과 결과가 일치하지 않습니다.');
 const restDays=forcedRestRemaining(r),forced=restDays>0;
 const action=currentAction(r),staminaBefore=r.stamina,growth={};
 let recovery;
 const lesson=classOf(action);
 if(lesson){
  if(result?.gameId!==lesson.id||result?.locationId!==lesson.locationId||result?.difficulty!==difficultyForStat(r.stats[lesson.stat])||
   !MINIGAME_OUTCOMES.includes(result?.outcome)||
   typeof result?.seed!=='string'||!Number.isFinite(result?.score)||!Number.isFinite(result?.durationMs)||
   !result?.metrics||typeof result.metrics!=='object'||Array.isArray(result.metrics)||!Object.hasOwn(result,'rewardInputs')||
   (result.rewardInputs!==null&&(typeof result.rewardInputs!=='object'||Array.isArray(result.rewardInputs))))
   throw new Error('공통 미니게임 결과 계약에 맞는 수업 결과가 필요합니다.');
  if(result.outcome==='quit')return false;
  const amount=growthForResult(result.outcome,result.difficulty,r.stamina),before=r.stats[lesson.stat];
  r.stats[lesson.stat]=Math.min(500,before+amount);growth[lesson.stat]=r.stats[lesson.stat]-before;
  r.stamina=Math.max(0,r.stamina-BALANCE.classCost);
  p.meta.counters.minigames++;p.meta.counters.classes++;
 }else if(action==='adventure'){
  if(result?.gameId!=='adventure'||!['complete','quit'].includes(result?.outcome))throw new Error('올바른 모험 결과가 필요합니다.');
  if(result.outcome==='quit')return false;
  r.stamina=Math.max(0,r.stamina-BALANCE.adventureCost);
  // Investigation, rewards and adventure stat growth remain excluded.
  p.meta.counters.adventures++;
 }else{
  if(result!==undefined)throw new Error('휴식 일정에는 수업·모험 결과를 적용할 수 없습니다.');
  if(forced){r.forcedRestDays=restDays-1;if(r.forcedRestDays===0)r.stamina=100;}
  else{recovery=restOutcome(random).recovery;r.stamina=Math.min(100,r.stamina+recovery);}
 }
 if(!forced)r.forcedRestDays=r.stamina<10?3:0;
 r.exhausted=r.forcedRestDays>0;
 const effect={outcome:lesson?result.outcome:'complete',staminaChange:r.stamina-staminaBefore,staminaAfter:r.stamina,growth,forcedRest:forced,forcedRestDays:r.forcedRestDays};
 if(recovery!==undefined)effect.restRecovery=recovery;
 (r.actionHistory??=[]).push({week:r.week,day:r.day,action,effect});
 r.lastAction=token;r.day++;if(r.day===5)r.phase='WEEK_COMPLETE';return true;
}
export function finishWeek(p,id){
 const r=runOf(p,id);if(r.phase!=='WEEK_COMPLETE')throw new Error('평일 5회 행동을 먼저 마쳐야 합니다.');
 if(r.week===52){r.phase='AWAITING_ENDING';return;}r.week++;r.day=0;r.schedule=[];r.phase='PLANNING';
}
export function deleteSlot(p,id){Object.assign(slotOf(p,id),{status:'EMPTY',activeRun:null,completedRunCount:0,lastSavedAt:null});}
