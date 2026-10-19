import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerEndingUI} from '../src/ui/server-ending.mjs';
import {endingNode as node,endingNodes as all,settleEnding} from './helpers/ending-dom.mjs';
import {createServerGameSession} from '../src/core/server-game-session.mjs';
const prepared={slotId:1,serverRevision:3,replayed:false,phase:'ENDING_READY',recordId:'run-1',character:{id:'CH01',name:'카엘'},ending:{id:'ENDING_STARPATH_PIONEER',name:'별길 개척자',subtitle:null,type:'FALLBACK',careerAnchor:'길',futureSceneGuide:'미래'},letter:{content:'카엘에게\n별길 개척자의 미래를 응원해.\n— 아르카디아 아카데미'},playRecords:[{type:'classCount',label:'수업',count:12},{type:'adventureCount',label:'모험',count:8},{type:'restCount',label:'휴식',count:4},{type:'importantChoiceCount',label:'중요 선택',count:1}],representativeChoices:[]};

function setup(initialPhase='ENDING_PENDING',{prepareLetter=async()=>prepared}={}){
 let run={runId:'run-1',runNumber:1,characterId:'CH01',serverPhase:initialPhase,stats:{knowledge:342,expression:210,dexterity:180,exploration:305,magic:260},serverRunStatistics:{classCount:156,adventureCount:24,restCount:37,npcEncounterCount:18,locationDiscoveryCount:12,specialItemDiscoveryCount:28},endingDecision:initialPhase==='ENDING_PENDING'?undefined:{endingId:'ENDING_STARPATH_PIONEER',endingType:'FALLBACK',title:'별길 개척자',subtitle:null}},titleCount=0;
 const shell=node('main');shell.root=true;
 const calls={decision:0,prepare:0,finish:0,get:0};
 const game={
  async decideEnding(){calls.decision++;run={...run,serverPhase:'ENDING_DECIDED',endingDecision:{endingId:'ENDING_STARPATH_PIONEER',endingType:'FALLBACK',title:'별길 개척자',subtitle:null}};return {result:{endingId:'ENDING_STARPATH_PIONEER'}};},
  async prepareEnding(){calls.prepare++;const result=await prepareLetter();run={...run,serverPhase:'ENDING_READY'};return {result};},
  async finishEnding(){calls.finish++;run=null;return {result:{newlyUnlockedCharacterIds:['CH07'],progression:{pets:['PET02'],badges:[],puzzlePieces:[],roomBackgrounds:[]}}};},
 };
 const services={async getEnding(){calls.get++;return prepared;}};
 const mutate=async(work,continuation)=>{const value=await work();continuation?.(value);return true;};
 const ui=createServerEndingUI({el:node,btn:(text,fn,cls)=>Object.assign(node('button',text,cls),{onclick:fn}),shell,heading(title,cls){shell.className=cls;shell.replaceChildren(node('h1',title));},current:()=>run,slotId:()=>1,game,services,mutate,onTitle:()=>titleCount++,character:()=>({id:'CH01',name:'카엘'})});
 const click=async text=>{const button=all(shell).find(item=>item.tag==='button'&&item.text===text);assert.ok(button,text);assert.equal(button.disabled,false,text);await button.onclick();};
 return {ui,shell,calls,click,title:()=>titleCount};
}

test('year summary uses full run counts and the reveal prepares once before finishing once',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const s=setup();s.ui.render();assert.match(s.shell.textContent,/1년 동안 정말 잘 해냈어/);assert.equal(s.calls.decision,0);
 await s.click('엔딩 보기');assert.match(s.shell.textContent,/지식.*342/);assert.match(s.shell.textContent,/수업.*156/);assert.match(s.shell.textContent,/휴식.*37/);assert.doesNotMatch(s.shell.textContent,/체력/);
 await s.click('편지 보기');await settleEnding();assert.match(s.shell.textContent,/무엇을 지켰니/);assert.doesNotMatch(s.shell.textContent,/별길 개척자의 미래/);
 t.mock.timers.tick(3400);await settleEnding();assert.match(s.shell.textContent,/별길 개척자의 미래/);
 await s.click('다음 이야기로');assert.match(s.shell.textContent,/새로운 캐릭터 · 1/);assert.match(s.shell.textContent,/새로운 펫 · 1/);assert.equal(s.calls.decision,1);assert.equal(s.calls.prepare,1);assert.equal(s.calls.finish,1);await s.click('타이틀로');assert.equal(s.title(),1);
});

test('reconnect reuses the stored letter during the question without generating again',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const s=setup('ENDING_READY');s.ui.render();await settleEnding();assert.equal(s.calls.get,1);assert.equal(s.calls.prepare,0);assert.match(s.shell.textContent,/무엇을 지켰니/);
 t.mock.timers.tick(3400);await settleEnding();assert.match(s.shell.textContent,/별길 개척자의 미래/);assert.equal(s.calls.prepare,0);
});

test('question stays on screen until a slow validated letter arrives',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let deliver;
 const s=setup('ENDING_DECIDED',{prepareLetter:()=>new Promise(resolve=>deliver=resolve)});s.ui.render();await settleEnding();
 t.mock.timers.tick(10000);await settleEnding();assert.match(s.shell.textContent,/무엇을 지켰니/);assert.ok(!all(s.shell).some(item=>item.tag==='button'&&item.text==='다음 이야기로'));
 deliver(prepared);await settleEnding();assert.match(s.shell.textContent,/별길 개척자의 미래/);assert.equal(s.calls.finish,0);
});

test('leaving the ending ignores a late letter and does not complete the run',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let deliver;
 const s=setup('ENDING_DECIDED',{prepareLetter:()=>new Promise(resolve=>deliver=resolve)});s.ui.render();await settleEnding();
 s.shell.className='title-page';s.shell.replaceChildren(node('h1','타이틀'));deliver(prepared);t.mock.timers.tick(10000);await settleEnding();
 assert.equal(s.shell.textContent,' 타이틀');assert.equal(s.calls.finish,0);
});

test('ending retries preserve the real session request and revision for prepare and finish',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const empty=slotId=>({slotId,status:'EMPTY',completedRunCount:0,activeRun:null,serverRevision:0});
 let slot={...empty(1),status:'PLAYING',serverRevision:2,activeRun:{runId:'run-1',runNumber:1,characterId:'CH01',week:52,day:'FRIDAY',phase:'ENDING_DECIDED',stats:{knowledge:50},stamina:{current:100},runStatistics:{},endingDecision:{endingId:'ENDING_STARPATH_PIONEER',endingType:'FALLBACK',title:'별길 개척자',subtitle:null}}};
 const collection={meta:{unlockedCharacterIds:['CH01'],unlockedPetIds:['PET01'],unlockedRoomBackgroundIds:['ROOM_DEFAULT'],acquiredPuzzlePieceIds:[]},settings:{activePetId:'PET01',activeRoomBackgroundId:'ROOM_DEFAULT'},statistics:{}};
 const prepareInputs=[],finishInputs=[];let ids=0,titles=0;
 const services={bootstrapAccount:async()=>({}),listSaveSlots:async()=>({slots:[slot,...[2,3,4,5].map(empty)]}),getSaveSlot:async()=>slot,getCollection:async()=>collection,
  prepareEnding:async(_slotId,input)=>{prepareInputs.push(structuredClone(input));if(prepareInputs.length===1)throw Error('offline');return {...prepared,serverRevision:3};},
  finishEnding:async(_slotId,input)=>{finishInputs.push(structuredClone(input));if(finishInputs.length===1)throw Error('offline');slot={...slot,status:'RUN_COMPLETE',completedRunCount:1,activeRun:null,serverRevision:4};return {serverRevision:4,slot};}
 };
 const game=createServerGameSession({services,requestIdFactory:()=>`ending-request-${++ids}`});await game.load();
 const shell=node('main');shell.root=true;
 const ui=createServerEndingUI({el:node,btn:(text,fn,cls)=>Object.assign(node('button',text,cls),{onclick:fn}),shell,heading(title,cls){shell.className=cls;shell.replaceChildren(node('h1',title));},current:()=>game.slot(1).activeRun,slotId:()=>1,game,services,mutate:async(work,done)=>{try{const result=await work();done?.(result);return true;}catch{return false;}},onTitle:()=>titles++});
 const click=async text=>{const control=all(shell).find(item=>item.tag==='button'&&item.text===text);assert.ok(control,text);await control.onclick();await settleEnding();};
 ui.render();await settleEnding();assert.equal(game.pending().service,'prepareEnding');t.mock.timers.tick(3400);await click('다시 시도');assert.match(shell.textContent,/별길 개척자의 미래/);
 assert.deepEqual(prepareInputs,[{requestId:'ending-request-1',expectedServerRevision:2},{requestId:'ending-request-1',expectedServerRevision:2}]);
 await click('다음 이야기로');assert.equal(titles,0);await click('다음 이야기로');assert.equal(titles,1);
 assert.deepEqual(finishInputs,[{recordId:'run-1',requestId:'ending-request-2',expectedServerRevision:3},{recordId:'run-1',requestId:'ending-request-2',expectedServerRevision:3}]);
 assert.equal(game.slot(1).completedRunCount,1);
});
