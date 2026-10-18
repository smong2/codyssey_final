import test from 'node:test';
import assert from 'node:assert/strict';
import {createDialogueSession} from '../src/core/dialogue-session.mjs';
import * as dialogue from '../src/core/dialogue-session.mjs';
import {createProfile,startRun,completeMainStory,setSchedule,beginAction,applyAction} from '../src/core/state.mjs';
import {validateProfile,createLocalRepository,STORAGE_KEY} from '../src/core/storage.mjs';

function completedMain(){
 const profile=createProfile();startRun(profile,1,'CH01');const run=profile.slots[0].activeRun;
 const activeRun=structuredClone(run);completeMainStory(activeRun,'MS01');activeRun.stats.knowledge=52;
 return {profile,run,response:{success:true,completionMode:'COMPLETE',serverRevision:'r2',activeRun,appliedSummary:{visibleStatDelta:{knowledge:2}}}};
}
test('server dialogue completion replaces the run without adding rewards twice and preserves other slots',()=>{
 assert.equal(typeof dialogue.prepareDialogueCompletion,'function');
 const {profile,run,response}=completedMain();startRun(profile,2,'CH02');const before=structuredClone(profile);
 const prepared=dialogue.prepareDialogueCompletion(profile,1,response,{run,eventId:'MS01'});
 assert.equal(prepared.profile.slots[0].activeRun.stats.knowledge,52);
 assert.equal(prepared.profile.slots[0].serverRevision,'r2');
 assert.deepEqual(prepared.profile.slots[1],before.slots[1]);assert.deepEqual(profile,before);
 assert.deepEqual(prepared.visibleStatDelta,{knowledge:2});validateProfile(prepared.profile);
});
test('server stat aliases are normalized at the boundary without changing the source response',()=>{
 assert.equal(typeof dialogue.prepareDialogueCompletion,'function');
 const {profile,run,response}=completedMain();response.activeRun.stats.skill=54;delete response.activeRun.stats.dexterity;
 response.activeRun.hiddenStats.caution=5;delete response.activeRun.hiddenStats.prudence;
 response.appliedSummary.visibleStatDelta={skill:4};const before=structuredClone(response);
 const prepared=dialogue.prepareDialogueCompletion(profile,1,response,{run,eventId:'MS01'});
 assert.equal(prepared.profile.slots[0].activeRun.stats.dexterity,54);
 assert.equal(prepared.profile.slots[0].activeRun.hiddenStats.prudence,5);
 assert.deepEqual(prepared.visibleStatDelta,{dexterity:4});assert.deepEqual(response,before);
});
test('wrong-run, unresolved story, invalid revision, and skip rewards never overwrite the live state',()=>{
 assert.equal(typeof dialogue.prepareDialogueCompletion,'function');
 for(const change of [r=>r.activeRun.runNumber++,r=>r.activeRun.characterId='CH02',r=>r.activeRun.day++,r=>r.activeRun.mainStory.pendingId='MS01',r=>delete r.serverRevision,r=>r.completionMode='SKIP',r=>r.appliedSummary.visibleStatDelta={hiddenStat:8},r=>r.activeRun.stats.skill=99]){
  const {profile,run,response}=completedMain(),before=structuredClone(profile);change(response);
  assert.throws(()=>dialogue.prepareDialogueCompletion(profile,1,response,{run,eventId:'MS01'}));assert.deepEqual(profile,before);
 }
});
test('dialogue responses cannot drop completed activity history or overwrite a replaced run',()=>{
 assert.equal(typeof dialogue.prepareDialogueCompletion,'function');
 const {profile,run,response}=completedMain();const sameShape=structuredClone(run);profile.slots[0].activeRun=sameShape;
 assert.throws(()=>dialogue.prepareDialogueCompletion(profile,1,response,{run,eventId:'MS01'}));
});
test('runtime connects rendering to server completion and durable state before continuing',async()=>{
 assert.equal(typeof dialogue.createDialogueRuntime,'function');
 let {profile,response}=completedMain(),handlers,continued=0,saved=null;
 const runtime=dialogue.createDialogueRuntime({services:{loadDialogue:async()=>({...payload,eventId:'MS01'}),completeDialogue:async()=>response},
  getProfile:()=>profile,getSlotId:()=>1,getUid:()=>null,setProfile:value=>profile=value,
  persist:value=>createLocalRepository({setItem(key,text){assert.equal(key,STORAGE_KEY);saved=JSON.parse(text);}}).save(value),
  render:(_payload,value)=>handlers=value,onError:error=>{throw error;},requestIdFactory:()=> 'runtime-request'});
 profile.slots[0].serverRevision='r1';
 await runtime.start('MS01',({visibleStatDelta})=>{continued++;assert.equal(saved.slots[0].activeRun.stats.knowledge,52);assert.deepEqual(visibleStatDelta,{knowledge:2});});
 await handlers.onComplete({completionMode:'COMPLETE',selectedChoices:[]});
 assert.equal(profile.slots[0].serverRevision,'r2');assert.equal(continued,1);
 assert.equal(profile.slots[0].activeRun.dialogueHistory[0].eventId,'MS01');
 assert.deepEqual(profile.slots[0].activeRun.dialogueHistory[0].selectedChoices,[]);
});
test('runtime save retries reuse the server response and never expose an unpersisted new state',async()=>{
 assert.equal(typeof dialogue.createDialogueRuntime,'function');
 let {profile,response}=completedMain(),handlers,retry,requests=0,writes=0;profile.slots[0].serverRevision='r1';
 const runtime=dialogue.createDialogueRuntime({services:{loadDialogue:async()=>({...payload,eventId:'MS01'}),completeDialogue:async()=>{requests++;return response;}},
  getProfile:()=>profile,getSlotId:()=>1,getUid:()=>null,setProfile:value=>profile=value,persist:()=>{if(++writes===1)throw new Error('disk full');},
  render:(_payload,value)=>handlers=value,onError:(_error,again)=>retry=again,requestIdFactory:()=> 'same-request'});
 await runtime.start('MS01',()=>{});await handlers.onComplete({completionMode:'COMPLETE',selectedChoices:[]});
 assert.equal(profile.slots[0].activeRun.stats.knowledge,50);assert.equal(profile.slots[0].serverRevision,'r1');
 await retry();assert.equal(profile.slots[0].activeRun.stats.knowledge,52);assert.equal(requests,1);
});
test('runtime ignores completion after an account change before touching persistence',async()=>{
 assert.equal(typeof dialogue.createDialogueRuntime,'function');
 let {profile,response}=completedMain(),handlers,uid='account-a',release,writes=0;profile.slots[0].serverRevision='r1';
 const delayed=new Promise(resolve=>release=resolve);
 const runtime=dialogue.createDialogueRuntime({services:{loadDialogue:async()=>({...payload,eventId:'MS01'}),completeDialogue:()=>delayed},getProfile:()=>profile,getSlotId:()=>1,getUid:()=>uid,
  setProfile:value=>profile=value,persist:()=>writes++,render:(_payload,value)=>handlers=value,onError:()=>{},requestIdFactory:()=> 'old-account'});
 await runtime.start('MS01',()=>{});const finishing=handlers.onComplete({completionMode:'COMPLETE',selectedChoices:[]});uid='account-b';release(response);await finishing;
 assert.equal(writes,0);assert.equal(profile.slots[0].activeRun.stats.knowledge,50);
});
for(const eventId of ['NPC_GUIDE_01','LOC_GH_01'])test(eventId+' uses the same service runtime and preserves all choices without consuming another day',async()=>{
 let profile=createProfile(),run=startRun(profile,1,'CH01'),handlers;completeMainStory(run,'MS01');setSchedule(profile,1,['adventure','rest','rest','rest','rest']);beginAction(profile,1,'1:1:0');applyAction(profile,1,'1:1:0',{gameId:'adventure',outcome:'complete'});
 profile.slots[0].serverRevision='r1';run.pendingDialogue={eventId,activityToken:'1:1:0'};
 const activeRun=structuredClone(run);delete activeRun.pendingDialogue;activeRun.stats.expression=51;
 const choices=[{choiceNodeId:'C1',choiceId:'A'},{choiceNodeId:'C2',choiceId:'B'}];
 const runtime=dialogue.createDialogueRuntime({services:{loadDialogue:async()=>({...payload,eventId}),completeDialogue:async input=>{assert.deepEqual(input.selectedChoices,choices);return {success:true,completionMode:'COMPLETE',serverRevision:'r2',activeRun,appliedSummary:{visibleStatDelta:{expression:1}}};}},
 getProfile:()=>profile,getSlotId:()=>1,setProfile:value=>profile=value,persist:value=>validateProfile(value),render:(_payload,value)=>handlers=value,onError:error=>{throw error;},requestIdFactory:()=> 'request'});
 await runtime.start(eventId,()=>{});await handlers.onComplete({completionMode:'COMPLETE',selectedChoices:choices});
 assert.equal(profile.slots[0].activeRun.day,1);assert.equal(profile.slots[0].activeRun.stamina,85);
 assert.deepEqual(profile.slots[0].activeRun.dialogueHistory[0].selectedChoices,choices);assert.equal(profile.slots[0].activeRun.pendingDialogue,undefined);
});
test('a failed dialogue render can reload rather than retrying a nonexistent completion',async()=>{
 let {profile}=completedMain(),tries=0,retry;profile.slots[0].serverRevision='r1';
 const runtime=dialogue.createDialogueRuntime({services:{loadDialogue:async()=>({...payload,eventId:'MS01'})},getProfile:()=>profile,getSlotId:()=>1,setProfile:()=>{},persist:()=>{},
 render:()=>{if(++tries===1)throw new Error('bad payload');},onError:(_error,again)=>retry=again});
 assert.equal(await runtime.start('MS01',()=>{}),false);assert.equal(await retry(),true);assert.equal(tries,2);
});
test('service payload schema and skip policy must be explicit before formal dialogue rendering',async()=>{
 for(const change of [value=>value.schemaVersion=2,value=>delete value.canSkip,value=>value.speakers=null]){
  const invalid=structuredClone(payload);change(invalid);const {session,calls}=setup({loadDialogue:async()=>invalid});
  assert.equal(await session.start({slotId:'slot-1',eventId:'E1'}),false);assert.equal(calls.rendered.length,0);
 }
});

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
 assert.equal(session.hasPendingCompletion(),true);
 assert.equal(await session.retry(),true);
 assert.equal(session.hasPendingCompletion(),false);
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
