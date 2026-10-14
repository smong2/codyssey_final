import {classOf} from './classes.mjs';

export function endingSnapshot(run,character){
 const history=run.actionHistory;
 return {character:{id:character.id,name:character.name},runNumber:run.runNumber,week:run.week,
  readyForEnding:run.phase==='AWAITING_ENDING',hasHistory:Array.isArray(history),
  counts:{classes:(history??[]).filter(h=>classOf(h.action)).length,adventures:(history??[]).filter(h=>h.action==='adventure').length,rests:(history??[]).filter(h=>h.action==='rest').length}};
}

// Client display adapter proposal, not a finalized HTTP or AI request contract.
export function validateEndingView(value,{slotId,runNumber}){
 if(!value||value.slotId!==slotId||value.runNumber!==runNumber)throw new Error('현재 회차와 다른 엔딩 응답입니다.');
 if(typeof value.career?.id!=='string'||!value.career.id.trim()||typeof value.career.name!=='string'||!value.career.name.trim())throw new Error('확정 직업 정보가 없습니다.');
 const letter=value.letter;
 if(!letter||!['pending','ready','failed'].includes(letter.status))throw new Error('편지 상태를 확인할 수 없습니다.');
 if(letter.status==='ready'&&(letter.validated!==true||letter.careerId!==value.career.id||!['ai','fallback'].includes(letter.source)||['future','reflection','encouragement'].some(k=>typeof letter.sections?.[k]!=='string'||!letter.sections[k].trim())))throw new Error('검증된 직업·편지 정보가 필요합니다.');
 return structuredClone(value);
}

export function exampleEnding(name){
 return {career:{id:'preview-rune-scholar',name:'룬 연구가'},letter:{status:'ready',source:'example',sections:{
  future:`${name}에게. 이번 화면에서 그려 보는 미래는 룬 연구가야.`,
  reflection:'작은 룬의 변화를 발견하고 친구들과 그 의미를 나누었던 이야기를 떠올려 보자. 이 문장은 화면 확인을 위한 예시야.',
  encouragement:'호기심을 따라 한 걸음씩 나아가며, 새로운 발견을 함께 나누는 미래를 상상해 봐. — 아르카디아 아카데미'
 }}};
}
