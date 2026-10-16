import test from 'node:test';
import assert from 'node:assert/strict';
import {endingSnapshot,validateEndingView,exampleEnding} from '../src/core/ending-frame.mjs';
test('ending frame uses current run activity records and never completes or changes the run',()=>{
 const run={runNumber:2,week:3,phase:'PLANNING',actionHistory:[{action:'rest'},{action:'adventure'},{action:'rune-link'}]},before=structuredClone(run);
 const view=endingSnapshot(run,{id:'CH01',name:'카엘'});
 assert.deepEqual(view.counts,{classes:1,adventures:1,rests:1});assert.equal(view.readyForEnding,false);assert.deepEqual(run,before);
 assert.equal(endingSnapshot({...run,actionHistory:undefined},{id:'CH01',name:'카엘'}).hasHistory,false);
});
test('only same-slot same-run validated letters for the confirmed career can be displayed',()=>{
 const key={slotId:1,runNumber:2},response={...key,career:{id:'career1',name:'확정 직업'},letter:{status:'ready',source:'ai',validated:true,careerId:'career1',sections:{future:'미래',reflection:'회고',encouragement:'응원'}}};
 assert.deepEqual(validateEndingView(response,key),response);
 assert.throws(()=>validateEndingView({...response,slotId:2},key));
 assert.throws(()=>validateEndingView({...response,runNumber:1},key));
 assert.throws(()=>validateEndingView({...response,letter:{...response.letter,careerId:'other'}},key));
 assert.throws(()=>validateEndingView({...response,letter:{...response.letter,validated:false}},key));
 assert.throws(()=>validateEndingView({...response,letter:{...response.letter,sections:{future:'미래'}}},key));
 assert.equal(validateEndingView({...response,letter:{...response.letter,source:'fallback'}},key).letter.source,'fallback');
 for(const status of ['pending','failed'])assert.equal(validateEndingView({...response,letter:{status}},key).career.name,'확정 직업');
});
test('short fixture is explicitly an example and cannot be accepted as a backend ending',()=>{
 const example=exampleEnding('아이리스');assert.equal(example.letter.source,'example');assert.match(example.letter.sections.future,/아이리스/);
 assert.throws(()=>validateEndingView({...example,slotId:1,runNumber:1},{slotId:1,runNumber:1}));
});
