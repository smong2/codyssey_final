import test from 'node:test';
import assert from 'node:assert/strict';
import {createNarrativeDialoguePayload} from '../src/core/narrative-dialogue.mjs';

test('converts saved NPC narrative lines and choice effect ids to shared dialogue without player artwork',()=>{
 const pending={id:'NPC_GUIDE_01',kind:'npc',title:'안내지 줍기',actor:{id:'CH15',name:'티아',image:'tia.png'},content:{lines:[{speaker:'티아',text:'첫 대사'},{speaker:'카엘',text:'둘째 대사'}],choices:[{id:'look',label:'살펴본다',reaction:'같이 살펴본다.',growth:{magic:2}}],closing:'장면을 마친다.'}};
 const payload=createNarrativeDialoguePayload(pending,{playerName:'카엘'});
 assert.equal(payload.previewOnly,true);assert.equal(payload.canSkip,true);
 assert.match(payload.previewNotice,/로컬 이야기 데이터/);
 assert.deepEqual(payload.sequence.map(node=>node.type),['IMAGE','LINE','LINE','CHOICE','LINE','END']);
 assert.equal(payload.sequence[1].speaker,'CH15');
 assert.equal(payload.sequence[2].speaker,'PLAYER');
 assert.equal(payload.sequence[1].visualMode,'KEEP');
 assert.equal(payload.sequence[3].options[0].choiceId,'look');
 assert.equal(payload.sequence[3].options[0].reaction[0].speaker,'CH15');
 assert.deepEqual(payload.speakers.PLAYER,{kind:'PLAYER',id:null,name:'카엘'});
 assert.equal(payload.sequence[5].type,'END');
});

test('shows an unregistered frame with no fabricated dialogue and a continue action',()=>{
 const payload=createNarrativeDialoguePayload({id:'LOC_01',kind:'location',title:'장소의 이야기',actor:null,content:null});
 assert.equal(payload.canSkip,false);
 assert.equal(payload.finishLabel,'계속');
 assert.deepEqual(payload.sequence,[{type:'LINE',lineMode:'NARRATION',text:'미등록 프레임 · 정식 대화 원고를 기다리고 있습니다.',visualMode:'NONE'},{type:'END'}]);
});
