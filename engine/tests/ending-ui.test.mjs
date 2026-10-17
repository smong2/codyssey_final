import test from 'node:test';
import assert from 'node:assert/strict';
import {createEndingUI} from '../src/ui/ending.mjs';
function node(tag,text='',className=''){return {tag,text,className,children:[],disabled:false,append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},get textContent(){return [this.text,...this.children.map(n=>n.textContent)].join(' ');}};}
const all=n=>[n,...n.children.flatMap(all)];
function setup({ready=false,newUnlocks=[],loadEnding=null,save=true}={}){
 const shell=node('main'),calls={finished:0,received:0},record={careerId:'ENDING_RUNE_RESEARCHER',careerName:'룬 연구자',records:[{key:'classes',value:10},{key:'npcMeetings',value:null}],letter:ready?{status:'ready',sections:{future:'준비된 미래',reflection:'준비된 기록',encouragement:'준비된 응원'}}:{status:'pending'},newUnlocks};
 const run={runNumber:1,week:52,phase:'AWAITING_ENDING',endingRecord:record};shell.classList={contains:cls=>shell.className===cls};shell.querySelector=()=>shell.children[0];
 const ui=createEndingUI({el:node,btn:(text,fn,cls)=>Object.assign(node('button',text,cls),{onclick:fn}),shell,heading(title,cls){shell.className=cls;shell.replaceChildren(node('h1',title));},current:()=>run,character:()=>({id:'CH01',name:'카엘'}),slotId:()=>1,onReturn(){},onComplete(){calls.finished++;},loadEnding,onReceive(value){calls.received++;if(!save)return false;record.letter=value.letter;return true;}});
 const click=text=>{const b=all(shell).find(n=>n.tag==='button'&&n.text===text);assert.ok(b,text);assert.equal(b.disabled,false,text);b.onclick();};
 return {ui,shell,run,record,calls,click};
}
test('saved ending reopens at the question, shows the prepared letter without loading, and skips empty unlock summaries',()=>{
 const s=setup({ready:true,loadEnding:()=>{throw Error('must not reload');}});s.ui.render({actual:true});assert.match(s.shell.textContent,/무엇을 지켰니/);s.click('계속');assert.match(s.shell.textContent,/새로운 문양을 읽는 사람/);s.click('편지 보기');assert.match(s.shell.textContent,/준비된 응원/);assert.doesNotMatch(s.shell.textContent,/기준|기록 없음/);s.click('타이틀로');assert.equal(s.calls.finished,1);
 s.ui.render({actual:true});assert.match(s.shell.textContent,/무엇을 지켰니/);
});
test('the ending cannot complete without a letter and actual received unlocks appear in one summary',()=>{
 const waiting=setup();waiting.ui.render({actual:true});waiting.click('계속');waiting.click('편지 보기');assert.equal(all(waiting.shell).find(n=>n.text==='타이틀로').disabled,true);
 const s=setup({ready:true,newUnlocks:[{kind:'character',id:'CH03'},{kind:'pet',id:'PET02'}]});s.ui.render({actual:true});s.click('계속');s.click('편지 보기');s.click('다음');assert.match(s.shell.textContent,/새로운 캐릭터 1명/);assert.match(s.shell.textContent,/새로운 펫 1마리/);s.click('타이틀로');assert.equal(s.calls.finished,1);
});
test('a late ending response is ignored after leaving the ending surface',async()=>{
 let deliver;const s=setup({loadEnding:()=>new Promise(resolve=>deliver=resolve)});s.ui.render({actual:true});s.click('계속');s.click('편지 보기');s.shell.className='myroom-page';deliver({slotId:1,runNumber:1,career:{id:s.record.careerId,name:s.record.careerName},letter:{status:'pending'}});await new Promise(resolve=>setImmediate(resolve));assert.equal(s.calls.received,0);
});
test('failed prepared-result persistence retries the same response without refetching or completing',async()=>{
 let loads=0;const s=setup({save:false,loadEnding:async()=>{loads++;return {slotId:1,runNumber:1,career:{id:'ENDING_RUNE_RESEARCHER',name:'룬 연구자'},letter:{status:'pending'}};}});s.ui.render({actual:true});s.click('계속');s.click('편지 보기');await new Promise(resolve=>setImmediate(resolve));s.click('다시 시도');await new Promise(resolve=>setImmediate(resolve));assert.equal(loads,1);assert.equal(s.calls.received,2);assert.equal(s.calls.finished,0);
});
