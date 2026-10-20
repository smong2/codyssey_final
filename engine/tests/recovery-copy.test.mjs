import test from 'node:test';
import assert from 'node:assert/strict';
import {dialogueRecoveryCopy,serverLoadRecoveryCopy,serverSaveRecoveryCopy} from '../src/core/recovery-copy.mjs';

test('save recovery copy keeps network failures simple and actionable',()=>{
 const copy=serverSaveRecoveryCopy({code:'NETWORK',message:'API에 연결하지 못했습니다.'});
 assert.equal(copy.title,'연결이 잠깐 끊겼어요');
 assert.equal(copy.retryLabel,'다시 저장하기');
 assert.equal(copy.loadLabel,'저장된 곳에서 이어하기');
 assert.doesNotMatch(Object.values(copy).join(' '),/API|서버|revision|409/i);
});

test('save conflicts offer one clear path to the latest saved game',()=>{
 const copy=serverSaveRecoveryCopy({code:'CONFLICT',status:409,message:'RevisionConflict'});
 assert.equal(copy.retryLabel,null);
 assert.equal(copy.loadLabel,'최근 저장 불러오기');
 assert.match(copy.title,/최근|저장/);
 const visible=[copy.title,copy.message,copy.hint,copy.status,copy.retryLabel,copy.loadLabel].filter(Boolean).join(' ');
 assert.doesNotMatch(visible,/revision|409|conflict/i);
});

test('load and dialogue recovery copy never exposes technical error wording',()=>{
 const load=serverLoadRecoveryCopy({code:'TIMEOUT',message:'API 응답 시간이 초과되었습니다.'}),dialogue=dialogueRecoveryCopy();
 assert.equal(load.actionLabel,'다시 불러오기');
 assert.equal(dialogue.actionLabel,'다시 시도하기');
 assert.doesNotMatch(Object.values(load).join(' '),/API|서버|TIMEOUT/i);
});
