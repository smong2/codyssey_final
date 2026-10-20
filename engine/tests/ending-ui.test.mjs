import test from 'node:test';
import assert from 'node:assert/strict';
import {createEndingUI} from '../src/ui/ending.mjs';
import {endingNode as node,endingNodes as all,settleEnding} from './helpers/ending-dom.mjs';
test('past ending letters are read without loading, completing a run, or changing the original record',()=>{
 const s=setup(),record={runNumber:2,careerName:'룬 연구자',letter:{status:'ready',source:'ai',sections:{future:'과거 미래',reflection:'과거 기억',encouragement:'과거 응원'}}},before=structuredClone(record);
 assert.equal(typeof s.ui.history,'function');s.ui.history([record]);
 assert.match(s.shell.textContent,/과거 기억/);assert.doesNotMatch(s.shell.textContent,/AI가 작성한/);
 assert.equal(s.calls.finished,0);assert.equal(s.calls.received,0);assert.deepEqual(record,before);
});
test('server ending history shows the saved career, stats, activity counts and letter verbatim',()=>{
 const s=setup(),content='카엘에게\n\n그날의 이야기를 기억해.\n\n— 아르카디아 아카데미';
 s.ui.history([{slotId:2,runNumber:3,endingId:'ENDING_RUNE_RESEARCHER',careerName:'룬 연구자',
  finalStats:{knowledge:211,expression:120,skill:98,exploration:57,magic:240},
  playStatistics:{classCount:72,adventureCount:41,restCount:33},letter:{content}}]);
 assert.match(s.shell.textContent,/3회차 · 룬 연구자/);assert.doesNotMatch(s.shell.textContent,/2번 슬롯/);
 assert.ok(all(s.shell).some(item=>item.className==='ending-history-title'&&item.text==='지난 엔딩 편지'));
 assert.match(s.shell.textContent,/지식 · 211/);
 assert.match(s.shell.textContent,/솜씨 · 98/);
 assert.match(s.shell.textContent,/수업 · 72회/);
 assert.match(s.shell.textContent,/휴식 · 33회/);
 assert.ok(all(s.shell).some(item=>item.className==='ending-card ending-history-card'));
 assert.ok(all(s.shell).some(item=>item.className==='ending-history-summary-grid'));
 assert.ok(all(s.shell).some(item=>item.className==='ending-history-letter-body'));
 assert.ok(all(s.shell).some(item=>item.className==='ending-letter-content'&&item.text===content));
 assert.ok(all(s.shell).some(item=>item.className==='close-x'));
 assert.ok(!all(s.shell).some(item=>item.tag==='button'&&item.text==='마이룸으로'));
});
function setup({ready=false,newUnlocks=[],loadEnding=null,save=true}={}){
 const shell=node('main'),calls={finished:0,received:0},record={careerId:'ENDING_RUNE_RESEARCHER',careerName:'룬 연구자',records:[{key:'classes',value:10},{key:'npcMeetings',value:null}],letter:ready?{status:'ready',sections:{future:'준비된 미래',reflection:'준비된 기록',encouragement:'준비된 응원'}}:{status:'pending'},newUnlocks};
 const run={characterId:'CH01',runNumber:1,week:52,phase:'AWAITING_ENDING',endingRecord:record};shell.root=true;
 const ui=createEndingUI({el:node,btn:(text,fn,cls)=>Object.assign(node('button',text,cls),{onclick:fn}),shell,heading(title,cls){shell.className=cls;shell.replaceChildren(node('h1',title));},current:()=>run,character:()=>({id:'CH01',name:'카엘'}),slotId:()=>1,onReturn(){},onComplete(){calls.finished++;},loadEnding,onReceive(value){calls.received++;if(!save)return false;record.letter=value.letter;return true;}});
 const click=text=>{const b=all(shell).find(n=>n.tag==='button'&&n.text===text);assert.ok(b,text);assert.equal(b.disabled,false,text);return b.onclick();};
 return {ui,shell,run,record,calls,click};
}
test('saved ending reopens at the question and reuses the prepared letter',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const s=setup({ready:true,loadEnding:()=>{throw Error('must not reload');}});s.ui.render({actual:true});assert.match(s.shell.textContent,/무엇을 지켰니/);
 t.mock.timers.tick(3400);await settleEnding();assert.match(s.shell.textContent,/새로운 문양을 읽는 사람/);assert.match(s.shell.textContent,/준비된 응원/);await s.click('다음 이야기로');assert.equal(s.calls.finished,1);
 s.ui.render({actual:true});assert.match(s.shell.textContent,/무엇을 지켰니/);
});
test('missing letters cannot finish and actual unlocks appear in one summary',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const waiting=setup();waiting.ui.render({actual:true});waiting.click('엔딩 보기');waiting.click('편지 보기');t.mock.timers.tick(3400);await settleEnding();assert.ok(!all(waiting.shell).some(n=>n.text==='다음 이야기로'));assert.equal(waiting.calls.finished,0);
 const s=setup({ready:true,newUnlocks:[{kind:'character',id:'CH03'},{kind:'pet',id:'PET02'}]});s.ui.render({actual:true});t.mock.timers.tick(3400);await settleEnding();s.click('다음 이야기로');assert.match(s.shell.textContent,/새로운 캐릭터 · 1/);assert.match(s.shell.textContent,/새로운 펫 · 1/);await s.click('타이틀로');assert.equal(s.calls.finished,1);
});
test('a late ending response is ignored after leaving the ending surface',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let deliver;const s=setup({loadEnding:()=>new Promise(resolve=>deliver=resolve)});s.ui.render({actual:true});s.click('엔딩 보기');s.click('편지 보기');s.shell.className='myroom-page';s.shell.replaceChildren();deliver({slotId:1,runNumber:1,career:{id:s.record.careerId,name:s.record.careerName},letter:{status:'pending'}});await settleEnding();assert.equal(s.calls.received,0);
});
test('failed prepared-result persistence retries the same response without refetching or completing',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let loads=0;const s=setup({save:false,loadEnding:async()=>{loads++;return {slotId:1,runNumber:1,career:{id:'ENDING_RUNE_RESEARCHER',name:'룬 연구자'},letter:{status:'pending'}};}});s.ui.render({actual:true});s.click('엔딩 보기');s.click('편지 보기');await settleEnding();s.click('다시 시도');await settleEnding();assert.equal(loads,1);assert.equal(s.calls.received,2);assert.equal(s.calls.finished,0);
});
