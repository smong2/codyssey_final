import test from 'node:test';
import assert from 'node:assert/strict';
import {characterProfileFields} from '../src/core/character-profile.mjs';
test('shared character profile preserves fields and makes missing content explicit',()=>{
 assert.deepEqual(characterProfileFields({profile:{personality:'관찰',background:'도서관',strength:'계획',difficulty:'감정 표현'}}),[['성격','관찰'],['배경','도서관'],['강점','계획'],['어려워하는 것','감정 표현']]);
 assert.deepEqual(characterProfileFields({}),[['성격','미등록'],['배경','미등록'],['강점','미등록'],['어려워하는 것','미등록']]);
});
