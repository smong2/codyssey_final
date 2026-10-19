import test from 'node:test';
import assert from 'node:assert/strict';
import {characterProfileFields} from '../src/core/character-profile.mjs';
import {appendCharacterInfo} from '../src/ui/character-info.mjs';

function element(tag,text='',className=''){
 return {tag,text,className,children:[],append(...children){this.children.push(...children);},get textContent(){return [this.text,...this.children.map(child=>child.textContent)].join(' ');}};
}
test('selection summary reuses identity, personality, strength and quote without changing the full profile',()=>{
 const student={name:'아이리스',description:'새 시도를 즐기는 모험가',profile:{personality:'호기심',background:'발명가의 딸',strength:'새로운 해결책',difficulty:'순간을 가리지 않는 농담',quote:'다시 해 보자!'}},before=structuredClone(student);
 const summary=element('aside');appendCharacterInfo(summary,student,element,{compact:true});
 assert.match(summary.textContent,/아이리스.*새 시도를 즐기는 모험가.*성격.*호기심.*강점.*새로운 해결책.*다시 해 보자!/);
 assert.doesNotMatch(summary.textContent,/발명가의 딸|어려워하는 것|순간을 가리지 않는 농담/);
 const full=element('aside');appendCharacterInfo(full,student,element);assert.match(full.textContent,/발명가의 딸/);assert.match(full.textContent,/어려워하는 것/);
 assert.deepEqual(student,before);
});
test('shared character profile preserves fields and makes missing content explicit',()=>{
 assert.deepEqual(characterProfileFields({profile:{personality:'관찰',background:'도서관',strength:'계획',difficulty:'감정 표현'}}),[['성격','관찰'],['배경','도서관'],['강점','계획'],['어려워하는 것','감정 표현']]);
 assert.deepEqual(characterProfileFields({}),[['성격','미등록'],['배경','미등록'],['강점','미등록'],['어려워하는 것','미등록']]);
});
