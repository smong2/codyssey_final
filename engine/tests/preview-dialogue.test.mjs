import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdmissionPreviewPayload,createPreviewDialoguePayload,createUnregisteredDialoguePayload} from '../src/core/preview-dialogue.mjs';

const content={previewOnly:true,title:'티아와의 작은 만남',speaker:'티아',image:'tia.png',line:'작은 것을 발견했다.',
 choices:[{id:'look',label:'살펴본다',reaction:'곁에서 이야기를 나눈다.'},{id:'leave',label:'돌아간다',reaction:'천천히 자리를 떠난다.'}],closing:'하루가 이어진다.'};

test('converts an NPC preview story to the shared dialogue contract without inventing authority',()=>{
 const payload=createPreviewDialoguePayload({eventId:'STORY-1',storyId:'STORY',npcId:'NPC01',locationId:'greenhouse'},content);
 assert.equal(payload.previewOnly,true);
 assert.equal(payload.dialogueToken,null);
 assert.equal(payload.canSkip,false);
 assert.equal(payload.speakers.NPC01.portraitSrc,'/character-assets/tia.png');
 assert.deepEqual(payload.sequence.map(node=>node.type),['LINE','CHOICE','LINE','END']);
 assert.equal(payload.sequence[0].text,content.line);
 assert.deepEqual(payload.sequence[1].options.map(option=>option.choiceId),['look','leave']);
 assert.equal(payload.sequence[1].options[0].reaction[0].text,content.choices[0].reaction);
 assert.equal(payload.sequence[2].text,content.closing);
 assert.equal(JSON.stringify(payload).includes('reward'),false);
});

test('keeps location stories as narration and does not fabricate a speaker portrait',()=>{
 const payload=createPreviewDialoguePayload({eventId:'PLACE-1',storyId:'PLACE',npcId:null,locationId:'greenhouse'},content);
 assert.deepEqual(payload.speakers,{});
 assert.equal(payload.sequence[0].lineMode,'NARRATION');
 assert.equal(payload.sequence[0].visualMode,'NONE');
 assert.equal(payload.sequence[1].options[0].reaction[0].lineMode,'NARRATION');
});

test('provides the existing unregistered NPC frame through the shared UI contract without adding script',()=>{
 const payload=createUnregisteredDialoguePayload({dialogueId:'BERN',title:'베른과 이야기하기',speakerId:'BERN',speakerName:'베른',portraitSrc:'/bern.png',frameText:'대화 원고가 아직 등록되지 않았습니다.',finishLabel:'마이룸으로'});
 assert.equal(payload.previewOnly,true);assert.equal(payload.canSkip,false);assert.equal(payload.speakers.BERN.portraitSrc,'/bern.png');
 assert.deepEqual(payload.sequence.map(node=>node.type),['IMAGE','LINE','END']);
 assert.equal(payload.sequence[1].text,'대화 원고가 아직 등록되지 않았습니다.');
 assert.equal(payload.finishLabel,'마이룸으로');
});

test('builds a clearly temporary admission dialogue with a centered NPC and no player portrait',()=>{
 const payload=createAdmissionPreviewPayload({id:'admission-arrival',title:'시계탑 광장에 도착'},
  {id:'CH16',name:'티아',image:'tia0_fullbody.png'});
 assert.equal(payload.previewOnly,true);
 assert.equal(payload.previewNotice,'임시 미리보기 · 정식 대사·캐스팅·보상 아님');
 assert.equal(payload.canSkip,true);
 assert.equal(payload.focusPosition,'CENTER');
 assert.deepEqual(payload.sequence.map(node=>node.type),['IMAGE','LINE','END']);
 assert.equal(payload.sequence[0].src,'/character-assets/tia0_fullbody.png');
 assert.equal(payload.sequence[1].lineMode,'DIALOGUE');
 assert.equal(payload.sequence[1].speaker,'CH16');
 assert.deepEqual(Object.keys(payload.speakers),['CH16']);
 assert.match(payload.sequence[1].text,/임시 문구/);
});
