import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerEndingUI} from '../src/ui/server-ending.mjs';

function node(tag,text='',className=''){
 const classes=new Set(className?className.split(/\s+/):[]);
 return {tag,text,className,children:[],disabled:false,classList:{contains:value=>classes.has(value)},append(...items){this.children.push(...items.filter(Boolean));},replaceChildren(...items){this.children=items.filter(Boolean);},get textContent(){return [this.text,...this.children.map(item=>item.textContent)].join(' ');}};
}
const all=value=>[value,...value.children.flatMap(all)];
const prepared={slotId:1,serverRevision:3,replayed:false,phase:'ENDING_READY',recordId:'run-1',character:{id:'CH01',name:'카엘'},ending:{id:'ENDING_STARPATH_PIONEER',name:'별길 개척자',subtitle:null,type:'FALLBACK',careerAnchor:'길',futureSceneGuide:'미래'},letter:{content:'카엘에게\n별길 개척자의 미래를 응원해.\n— 아르카디아 아카데미'},playRecords:[{type:'classCount',label:'수업',count:12},{type:'adventureCount',label:'모험',count:8},{type:'restCount',label:'휴식',count:4},{type:'importantChoiceCount',label:'중요 선택',count:1}],representativeChoices:[]};

function setup(initialPhase='ENDING_PENDING'){
 let run={runId:'run-1',runNumber:1,characterId:'CH01',serverPhase:initialPhase,endingDecision:initialPhase==='ENDING_PENDING'?undefined:{endingId:'ENDING_STARPATH_PIONEER',endingType:'FALLBACK',title:'별길 개척자',subtitle:null}},titleCount=0;
 const shell=node('main');shell.classList={contains:value=>shell.className===value};shell.querySelector=()=>shell.children.find(item=>item.tag==='h1')??null;
 const calls={decision:0,prepare:0,finish:0,get:0};
 const game={
  async decideEnding(){calls.decision++;run={...run,serverPhase:'ENDING_DECIDED',endingDecision:{endingId:'ENDING_STARPATH_PIONEER',endingType:'FALLBACK',title:'별길 개척자',subtitle:null}};return {result:{endingId:'ENDING_STARPATH_PIONEER'}};},
  async prepareEnding(){calls.prepare++;run={...run,serverPhase:'ENDING_READY'};return {result:prepared};},
  async finishEnding(){calls.finish++;run=null;return {result:{newlyUnlockedCharacterIds:['CH07'],progression:{pets:['PET02'],badges:[],puzzlePieces:[],roomBackgrounds:[]}}};},
 };
 const services={async getEnding(){calls.get++;return prepared;}};
 const mutate=async(work,continuation)=>{const value=await work();continuation?.(value);return true;};
 const ui=createServerEndingUI({el:node,btn:(text,fn,cls)=>Object.assign(node('button',text,cls),{onclick:fn}),shell,heading(title,cls){shell.className=cls;shell.replaceChildren(node('h1',title));},current:()=>run,slotId:()=>1,game,services,mutate,onTitle:()=>titleCount++,character:()=>({id:'CH01',name:'카엘'})});
 const click=async text=>{const button=all(shell).find(item=>item.tag==='button'&&item.text===text);assert.ok(button,text);assert.equal(button.disabled,false,text);await button.onclick();};
 return {ui,shell,calls,click,title:()=>titleCount};
}

test('server ending decides, prepares once, finishes once, then shows actual unlocks',async()=>{
 const s=setup();s.ui.render();assert.match(s.shell.textContent,/무엇을 지켰니/);await s.click('계속');assert.match(s.shell.textContent,/별길 개척자/);await s.click('편지 보기');assert.match(s.shell.textContent,/아르카디아 아카데미/);await s.click('엔딩 마치기');assert.match(s.shell.textContent,/새로운 캐릭터 · 1/);assert.match(s.shell.textContent,/새로운 펫 · 1/);assert.equal(s.calls.decision,1);assert.equal(s.calls.prepare,1);assert.equal(s.calls.finish,1);await s.click('타이틀로');assert.equal(s.title(),1);
});

test('reconnect at ENDING_READY reuses the stored letter and restarts from the fixed question',async()=>{
 const s=setup('ENDING_READY');s.ui.render();await new Promise(resolve=>setImmediate(resolve));assert.equal(s.calls.get,1);assert.equal(s.calls.prepare,0);assert.match(s.shell.textContent,/무엇을 지켰니/);await s.click('계속');await s.click('편지 보기');assert.equal(s.calls.prepare,0);assert.match(s.shell.textContent,/별길 개척자의 미래/);
});
