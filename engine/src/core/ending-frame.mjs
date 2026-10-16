import {classOf} from './classes.mjs';
export const ENDING_RECORD_LABELS={classes:'수업',adventures:'모험',npcMeetings:'NPC 만남',minigamesCleared:'미니게임 클리어',npcStoriesCompleted:'NPC 개별 스토리 완료',locationsDiscovered:'장소 발견',specialItemDiscoveries:'특별 발견',importantChoices:'중요 선택'};
export function displayedEndingRecords(record){
 const rows=record.playRecords??record.records??[];
 return Object.keys(ENDING_RECORD_LABELS).map(key=>rows.find(row=>row.key===key)).filter(row=>row&&Number.isSafeInteger(row.value)&&row.value>=0).slice(0,6);
}

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
 if(value.playRecords!==undefined&&(!Array.isArray(value.playRecords)||value.playRecords.length<4||value.playRecords.length>6||new Set(value.playRecords.map(r=>r?.key)).size!==value.playRecords.length||value.playRecords.some(r=>!Object.hasOwn(ENDING_RECORD_LABELS,r?.key)||!Number.isSafeInteger(r.value)||r.value<0)))throw new Error('실제 엔딩 기록 4~6개가 필요합니다.');
 if(value.newUnlocks!==undefined&&(!Array.isArray(value.newUnlocks)||new Set(value.newUnlocks.map(item=>item?.kind+':'+item?.id)).size!==value.newUnlocks.length||value.newUnlocks.some(item=>!['character','pet','badge','background'].includes(item?.kind)||typeof item.id!=='string'||!item.id.trim())))throw new Error('신규 해금 요약 정보가 올바르지 않습니다.');
 return structuredClone(value);
}

export function exampleEnding(name){
 return {career:{id:'preview-rune-scholar',name:'룬 연구가'},letter:{status:'ready',source:'example',sections:{
  future:`${name}에게. 이번 화면에서 그려 보는 미래는 룬 연구가야.`,
  reflection:'작은 룬의 변화를 발견하고 친구들과 그 의미를 나누었던 이야기를 떠올려 보자. 이 문장은 화면 확인을 위한 예시야.',
  encouragement:'호기심을 따라 한 걸음씩 나아가며, 새로운 발견을 함께 나누는 미래를 상상해 봐. — 아르카디아 아카데미'
 }}};
}
