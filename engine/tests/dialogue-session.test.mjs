import test from 'node:test';
import assert from 'node:assert/strict';
import {createDialogueSession} from '../src/core/dialogue-session.mjs';

const payload={schemaVersion:1,dialogueId:'SESSION',storyId:'S1',eventId:'E1',title:'세션',dialogueToken:'opaque-token',canSkip:false,speakers:{},sequence:[{type:'END'}]};
const result={success:true,completionMode:'COMPLETE',serverRevision:'r2',activeRun:{week:3,day:2}};
function setup(overrides={}){
 const calls={load:[],complete:[],applied:[],rendered:[],continued:0,errors:[]};let requestNumber=0;
 const session=createDialogueSession({
  loadDialogue:async input=>{calls.load.push(structuredClone(input));return {...payload,eventId:input.eventId};},
  completeDialogue:async input=>{calls.complete.push(structuredClone(input));return result;},
  context:()=>({expectedServerRevision:'r1'}),
  applyServerRun:async run=>{calls.applied.push(structuredClone(run));},
  onRender:(value,handlers)=>calls.rendered.push({value,handlers}),onContinue:()=>calls.continued++,onError:error=>calls.errors.push(error.message),
  requestIdFactory:()=>`request-${++requestNumber}`,
  ...overrides
 });
 return {session,calls};
}

test('loads the service payload and continues only after applying the server activeRun',async()=>{
 const {session,calls}=setup();
 assert.equal(await session.start({slotId:'slot-1',eventId:'MS01'}),true);
 assert.deepEqual(calls.load,[{slotId:'slot-1',eventId:'MS01'}]);
 assert.deepEqual(calls.rendered[0].value,{...payload,eventId:'MS01'});
 assert.equal(await calls.rendered[0].handlers.onComplete({completionMode:'COMPLETE',selectedChoices:[]}),true);
 assert.deepEqual(calls.complete,[{dialogueToken:'opaque-token',completionMode:'COMPLETE',selectedChoices:[],requestId:'request-1',expectedServerRevision:'r1'}]);
 assert.deepEqual(calls.applied,[result.activeRun]);
 assert.equal(calls.continued,1);
});

test('retries the exact completion input with one request id and no duplicate local application',async()=>{
 let attempts=0;const {session,calls}=setup({async completeDialogue(input){calls.complete.push(structuredClone(input));if(++attempts===1)throw new Error('offline');return result;}});
 await session.start({slotId:'slot-1',eventId:'NPC01'});
 const submit=calls.rendered[0].handlers.onComplete({completionMode:'COMPLETE',selectedChoices:[{choiceNodeId:'C1',choiceId:'A'}]});
 assert.equal(await submit,false);
 assert.equal(await session.retry(),true);
 assert.deepEqual(calls.complete[1],calls.complete[0]);
 assert.equal(calls.applied.length,1);assert.equal(calls.continued,1);
});

test('does not request an unavailable dialogue or invent a completion revision',async()=>{
 const missing=setup({loadDialogue:undefined});
 assert.equal(await missing.session.start({slotId:'slot-1',eventId:'MS01'}),false);
 assert.equal(missing.calls.rendered.length,0);
 const noRevision=setup({context:()=>({})});
 await noRevision.session.start({slotId:'slot-1',eventId:'MS01'});
 assert.equal(await noRevision.calls.rendered[0].handlers.onComplete({completionMode:'COMPLETE',selectedChoices:[]}),false);
 assert.equal(noRevision.calls.complete.length,0);
 assert.match(noRevision.calls.errors.at(-1),/revision/);
});

test('allows skip only when the loaded payload says canSkip',async()=>{
 const {session,calls}=setup({loadDialogue:async({eventId})=>({...payload,eventId,canSkip:false})});
 await session.start({slotId:'slot-1',eventId:'MS01'});
 assert.equal(await calls.rendered[0].handlers.onSkip({completionMode:'SKIP',selectedChoices:[]}),false);
 assert.equal(calls.complete.length,0);
});

test('retries local server-run application without sending a second completion request',async()=>{
 let applyCount=0;const {session,calls}=setup({async applyServerRun(){if(++applyCount===1)throw new Error('local save failed');}});
 await session.start({slotId:'slot-1',eventId:'MS01'});
 assert.equal(await calls.rendered[0].handlers.onComplete({completionMode:'COMPLETE',selectedChoices:[]}),false);
 assert.equal(await session.retry(),true);
 assert.equal(calls.complete.length,1);assert.equal(calls.continued,1);
});

test('ignores a late payload when the dialogue session is cancelled',async()=>{
 let release;const pending=new Promise(resolve=>{release=resolve;}),{session,calls}=setup({loadDialogue:()=>pending});
 const starting=session.start({slotId:'slot-1',eventId:'MS01'});session.cancel();release(payload);
 assert.equal(await starting,false);assert.equal(calls.rendered.length,0);assert.equal(calls.continued,0);
});

test('prevents leaving an event while its server completion is in flight',async()=>{
 let release,attempts=0,loads=0;const pending=new Promise(resolve=>{release=resolve;});
 const {session,calls}=setup({
  async loadDialogue({eventId}){loads++;return {...payload,eventId,dialogueToken:eventId};},
  async completeDialogue(input){calls.complete.push(structuredClone(input));if(++attempts===1)return pending;return {...result,completionMode:input.completionMode};}
 });
 await session.start({slotId:'slot-1',eventId:'OLD'});
 const oldFinish=calls.rendered[0].handlers.onComplete({completionMode:'COMPLETE',selectedChoices:[]});
 assert.equal(await session.start({slotId:'slot-1',eventId:'NEW'}),false);
 assert.equal(session.cancel(),false);
 assert.equal(loads,1);
 release(result);assert.equal(await oldFinish,true);
 assert.equal(calls.continued,1);
 assert.equal(await session.start({slotId:'slot-1',eventId:'NEW'}),true);
 assert.equal(loads,2);
});

test('does not render a payload for a different pending event',async()=>{
 const {session,calls}=setup({loadDialogue:async()=>payload});
 assert.equal(await session.start({slotId:'slot-1',eventId:'MS02'}),false);
 assert.equal(calls.rendered.length,0);
 assert.match(calls.errors.at(-1),/event/);
});
