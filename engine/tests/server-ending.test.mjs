import test from 'node:test';
import assert from 'node:assert/strict';
import {serverEndingDecision,serverEndingUnlockSummary,validateServerPreparedEnding} from '../src/core/server-ending.mjs';

const prepared={slotId:1,serverRevision:9,replayed:false,phase:'ENDING_READY',recordId:'run-1',character:{id:'CH01',name:'카엘'},ending:{id:'ENDING_STARPATH_PIONEER',name:'별길 개척자',subtitle:null,type:'FALLBACK',careerAnchor:'길',futureSceneGuide:'미래'},letter:{content:'카엘에게\n미래를 응원해.\n— 아르카디아 아카데미'},playRecords:[{type:'classCount',label:'수업 횟수',count:12},{type:'adventureCount',label:'모험 횟수',count:8},{type:'restCount',label:'휴식 횟수',count:4},{type:'importantChoiceCount',label:'중요 선택',count:1}],representativeChoices:[{eventId:'MS05',choiceId:'C1',week:49,summary:'사실을 먼저 알린다'}]};

test('prepared server ending validates run identity and server memory records',()=>{
 const value=validateServerPreparedEnding(prepared,{slotId:1,runId:'run-1'});assert.equal(value.ending.name,'별길 개척자');assert.equal(value.playRecords.length,4);
 assert.throws(()=>validateServerPreparedEnding({...prepared,recordId:'other'},{slotId:1,runId:'run-1'}),/다른 서버 엔딩/);
 assert.throws(()=>validateServerPreparedEnding({...prepared,playRecords:[...prepared.playRecords,{...prepared.playRecords[0]}]},{slotId:1,runId:'run-1'}),/플레이 기록/);
});

test('server ending decision never needs hidden-stat values in the engine view',()=>{
 const decision=serverEndingDecision({endingDecision:{endingId:'ENDING_A',endingType:'CAREER',title:'룬 연구자',subtitle:'별을 읽는 사람',hiddenScore:99}});assert.deepEqual(decision.endingId,'ENDING_A');
});

test('finish response converts only actual final unlocks to a display summary',()=>{
 const rows=serverEndingUnlockSummary({result:{newlyUnlockedCharacterIds:['CH07','CH07'],progression:{pets:['PET02'],badges:['BADGE_A'],puzzlePieces:['PUZZLE_1'],roomBackgrounds:['ROOM_01'],pendingCharacters:['CH08']}}});
 assert.deepEqual(rows.map(row=>row.id),['CH07','PET02','BADGE_A','PUZZLE_1','ROOM_01']);
});
