import {difficultyForStat} from './minigame-contract.mjs';

const finiteRange=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;

export function adventureObjectiveCount(storedExploration,masterObjectiveCount){
 if(!finiteRange(storedExploration,0,500))throw new Error('저장 탐험 스탯 범위가 올바르지 않습니다.');
 if(storedExploration<=100)return 1;
 if(storedExploration<=200)return 2;
 if(storedExploration<=350){if(![3,4].includes(masterObjectiveCount))throw new Error('어려움 모험은 미션 마스터의 목표 수 3 또는 4가 필요합니다.');return masterObjectiveCount;}
 return 5;
}

export function adventureDurationSeconds(storedExploration,petExplorationBonus=0){
 if(!finiteRange(storedExploration,0,500)||!Number.isFinite(petExplorationBonus))throw new Error('모험 시간 계산 스탯이 올바르지 않습니다.');
 const effective=Math.max(50,Math.min(500,storedExploration+petExplorationBonus));
 return effective<=50?120:Math.round(120+((effective-50)/450)*120);
}

export function createAdventureStartData({missionId,locationId,seed,storedExploration,petExplorationBonus=0,objectiveCount}){
 if(typeof missionId!=='string'||!missionId.trim()||typeof locationId!=='string'||!locationId.trim()||typeof seed!=='string'||!seed.trim())throw new Error('모험 미션 ID, 장소 ID, 시드가 필요합니다.');
 const count=adventureObjectiveCount(storedExploration,objectiveCount);
 return {gameId:'adventure',missionId,locationId,seed,difficulty:difficultyForStat(storedExploration),objectiveCount:count,
  durationSeconds:adventureDurationSeconds(storedExploration,petExplorationBonus)};
}

export function createAdventureResult(context,outcome,{foundCount,successGrowth=0,stamina=100}={}){
 if(!context||context.gameId!=='adventure'||typeof context.missionId!=='string'||!context.missionId||typeof context.locationId!=='string'||!context.locationId||typeof context.seed!=='string'||!context.seed||!Number.isInteger(context.difficulty)||context.difficulty<1||context.difficulty>4||!Number.isInteger(context.objectiveCount)||context.objectiveCount<1||context.objectiveCount>5)throw new Error('모험 시작 계약이 손상됐습니다.');
 if(!['MISSION_COMPLETE','TIMEOUT','INTERRUPTED'].includes(outcome))throw new Error('지원하지 않는 모험 결과입니다.');
 if(!Number.isInteger(foundCount)||foundCount<0||foundCount>context.objectiveCount)throw new Error('모험 발견 수가 올바르지 않습니다.');
 if(outcome==='MISSION_COMPLETE'&&foundCount!==context.objectiveCount)throw new Error('모든 목표를 발견해야 모험을 완료할 수 있습니다.');
 if(outcome==='TIMEOUT'&&foundCount>=context.objectiveCount)throw new Error('모든 목표 발견 전 시간 종료만 실패로 처리할 수 있습니다.');
 if(!Number.isInteger(successGrowth)||successGrowth<0||successGrowth>500||!finiteRange(stamina,0,100))throw new Error('모험 성공 성장 기준과 체력이 올바르지 않습니다.');
 const effectiveSuccessGrowth=stamina>=10&&stamina<=30?Math.floor(successGrowth/2):successGrowth;
 const explorationGrowth=outcome==='MISSION_COMPLETE'?effectiveSuccessGrowth:outcome==='TIMEOUT'&&foundCount>0?Math.max(1,Math.floor(effectiveSuccessGrowth*(foundCount/context.objectiveCount)*0.5)):0;
 return {...context,outcome,foundCount,successGrowth,explorationGrowth,rewardInputs:null};
}
