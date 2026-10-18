const clone=value=>value===undefined?undefined:structuredClone(value);
const string=value=>typeof value==='string'&&value.trim();

export function validateServerPreparedEnding(value,{slotId,runId}={}){
 if(!value||value.slotId!==slotId||value.phase!=='ENDING_READY'||value.recordId!==runId)throw new Error('현재 회차와 다른 서버 엔딩입니다.');
 if(!value.character||!string(value.character.id)||!string(value.character.name))throw new Error('엔딩 캐릭터 정보가 올바르지 않습니다.');
 const ending=value.ending;if(!ending||!string(ending.id)||!string(ending.name)||!['CAREER','FALLBACK'].includes(ending.type))throw new Error('확정 엔딩 정보가 올바르지 않습니다.');
 if(ending.subtitle!==null&&ending.subtitle!==undefined&&!string(ending.subtitle))throw new Error('엔딩 부제가 올바르지 않습니다.');
 if(!value.letter||!string(value.letter.content))throw new Error('검증된 엔딩 편지가 없습니다.');
 if(!Array.isArray(value.playRecords)||value.playRecords.length<4||value.playRecords.length>6)throw new Error('엔딩 플레이 기록은 4~6개여야 합니다.');
 const recordTypes=new Set();
 for(const record of value.playRecords){
  if(!record||!string(record.type)||!string(record.label)||!Number.isSafeInteger(record.count)||record.count<0||recordTypes.has(record.type))throw new Error('엔딩 플레이 기록이 올바르지 않습니다.');
  recordTypes.add(record.type);
 }
 if(!Array.isArray(value.representativeChoices)||value.representativeChoices.length>2)throw new Error('대표 선택 기록이 올바르지 않습니다.');
 for(const choice of value.representativeChoices){
  if(!choice||!string(choice.eventId)||!string(choice.choiceId)||!Number.isInteger(choice.week)||choice.week<1||choice.week>52||!string(choice.summary))throw new Error('대표 선택 기록이 올바르지 않습니다.');
 }
 return clone(value);
}

export function serverEndingUnlockSummary(finishResult){
 const result=finishResult?.result??finishResult??{},progression=result.progression??{};
 const groups=[
  ['character','새로운 캐릭터',result.newlyUnlockedCharacterIds],
  ['pet','새로운 펫',progression.pets],
  ['badge','새로운 배지',progression.badges],
  ['puzzle','새로운 퍼즐 조각',progression.puzzlePieces],
  ['background','새로운 마이룸 배경',progression.roomBackgrounds],
 ];
 return groups.flatMap(([kind,label,ids])=>Array.isArray(ids)?[...new Set(ids.filter(string))].map(id=>({kind,label,id})):[]);
}

export function serverEndingDecision(run){
 const decision=run?.endingDecision;
 if(!decision||!string(decision.endingId)||!string(decision.title)||!['CAREER','FALLBACK'].includes(decision.endingType))throw new Error('서버 엔딩 결정 정보가 올바르지 않습니다.');
 if(decision.subtitle!==null&&decision.subtitle!==undefined&&!string(decision.subtitle))throw new Error('서버 엔딩 부제가 올바르지 않습니다.');
 return clone(decision);
}
