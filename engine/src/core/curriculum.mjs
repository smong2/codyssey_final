import {CLASSES} from './classes.mjs';
import {createMinigameStartData,createMinigameResult,difficultyForStat} from './minigame-contract.mjs';
export const DIFFICULTY_NAMES=['EASY','NORMAL','HARD','VERY_HARD'];

export function curriculumStart({gameId,statValue,seed,consecutiveFailures=0,rewardInputs=null}){
 const lesson=CLASSES.find(item=>item.id===gameId);if(!lesson)throw new Error('등록되지 않은 본편 수업입니다.');
 const start=createMinigameStartData({gameId,locationId:lesson.locationId,statValue,seed,consecutiveFailures,maxDurationMs:lesson.durationMs,rewardInputs});
 const rewardDifficulty=difficultyForStat(statValue);
 return {...start,contractVersion:2,locationCode:lesson.locationCode,targetStat:lesson.stat,rewardDifficulty:DIFFICULTY_NAMES[rewardDifficulty-1],playDifficulty:DIFFICULTY_NAMES[start.difficulty-1],assistLevel:Math.min(2,Math.floor(consecutiveFailures/2))};
}
export function curriculumOutcome(gameId,metrics={},remainingMs=0,endReason='COMPLETE'){
 if(endReason==='QUIT'||endReason==='TIMEOUT')return 'FAIL';
 if(gameId==='starlight-stage'){const accuracy=metrics.total>0?metrics.hits/metrics.total:0;return accuracy>=.9?'GREAT':accuracy>=.65?'SUCCESS':'FAIL';}
 if(gameId==='spirit-pot-sort')return metrics.solved?(metrics.moves<=metrics.greatMoveLimit?'GREAT':'SUCCESS'):'FAIL';
 if(gameId==='rune-pin-training'&&(metrics.mistakes??0)>=3)return 'FAIL';
 const count=metrics.roundsCleared??0;
 if(count<2)return 'FAIL';
 if(count<3)return 'SUCCESS';
 if(gameId==='rune-pin-training')return (metrics.mistakes??Infinity)<=1?'GREAT':'SUCCESS';
 if(gameId==='sealed-shelves')return metrics.moves<=metrics.greatMoveLimit?'GREAT':'SUCCESS';
 return remainingMs>=20000?'GREAT':'SUCCESS';
}
export function curriculumResult(start,{metrics={},remainingMs=0,endReason='COMPLETE',score=0,durationMs=0}){
 if(!['COMPLETE','TIMEOUT','QUIT'].includes(endReason))throw new Error('수업 종료 사유가 올바르지 않습니다.');
 const outcome=curriculumOutcome(start.gameId,metrics,remainingMs,endReason);
 const base=createMinigameResult({...start,rewardDifficulty:DIFFICULTY_NAMES.indexOf(start.rewardDifficulty)+1},{FAIL:'failure',SUCCESS:'success',GREAT:'greatSuccess'}[outcome],score,durationMs,metrics);
 return {...base,contractVersion:2,locationCode:start.locationCode,targetStat:start.targetStat,rewardDifficulty:start.rewardDifficulty,playDifficulty:start.playDifficulty,assistLevel:start.assistLevel,outcome,endReason};
}
export function normalizeCurriculumResult(result,lesson,checkpoint){
 const outcomes={FAIL:'failure',SUCCESS:'success',GREAT:'greatSuccess'},reward=checkpoint.rewardDifficulty,play=checkpoint.playDifficulty;
 if(result?.contractVersion!==2||result.locationCode!==lesson.locationCode||result.targetStat!==lesson.stat||result.rewardDifficulty!==DIFFICULTY_NAMES[reward-1]||result.playDifficulty!==DIFFICULTY_NAMES[play-1]||result.difficulty!==play||result.assistLevel!==(checkpoint.assistLevel??reward-play)||!Object.hasOwn(outcomes,result.outcome)||!['COMPLETE','TIMEOUT','QUIT'].includes(result.endReason)||result.endReason!=='COMPLETE'&&result.outcome!=='FAIL')throw new Error('본편 수업 결과가 시작 계약과 일치하지 않습니다.');
 return {...result,rewardDifficulty:reward,outcome:outcomes[result.outcome]};
}
