import test from 'node:test';
import assert from 'node:assert/strict';
import * as flowApi from '../src/core/post-activity-story.mjs';
import {createProfile,startRun,setSchedule,beginAction,applyAction,finishWeek,recoverInterruptedAction} from '../src/core/state.mjs';
import {createLocalRepository,createBoundaryWriter,validateProfile} from '../src/core/storage.mjs';
import {finishNarrative,dismissNarrative,narrativeCandidates} from '../src/core/narrative.mjs';
import {createMinigameResult} from '../src/core/minigame-contract.mjs';

function fixture({friday=false,action='adventure'}={}){
 const profile=createProfile(),run=startRun(profile,1,'CH01');
 run.mainStory.pendingId=null;
 setSchedule(profile,1,friday?['rest','rest','rest','rest',action]:[action,'rest','rest','rest','rest']);
 if(friday)for(let day=0;day<4;day++){beginAction(profile,1,`1:1:${day}`);applyAction(profile,1,`1:1:${day}`);}
 const token=`1:1:${run.day}`;beginAction(profile,1,token);
 applyAction(profile,1,token,action==='adventure'?{gameId:'adventure',outcome:'complete'}:{skip:true});
 return {profile,run,activity:run.actionHistory.at(-1),token};
}
function harness(options={}){
 const data=fixture(options);let raw=null,fail=false,reads=0,stories=0,advances=0,confirm=null;
 const snapshots=[],repository=createLocalRepository({getItem:()=>raw,setItem:(_,value)=>{if(fail)throw new Error('full');raw=value;snapshots.push(JSON.parse(value));}}),writer=createBoundaryWriter(repository);
 let continuation=null;
 const save=next=>{continuation=next;try{writer.save(data.profile,1);}catch{return false;}const done=continuation;continuation=null;done?.();return true;};
 const receive=()=>{reads++;assert.ok(repository.load().slots[0].activeRun.pendingActivityStory);return options.received??null;};
 const flow=flowApi.createPostActivityStoryFlow({current:()=>data.run,save,receive,onStory:()=>stories++,onContinue:()=>advances++});
 return {...data,flow,repository,snapshots,get reads(){return reads;},get stories(){return stories;},get advances(){return advances;},get confirm(){return confirm;},setFail(value){fail=value;},
  complete(){return flow.complete(data.activity,next=>{confirm=next;});},
  retry(){writer.retry();const done=continuation;continuation=null;done?.();}};
}
const greeting=token=>({activityToken:token,kind:'greeting',npcId:'CH16',content:{lines:[{speaker:'티아',text:'테스트 인사'}]}});

test('result confirmation and successful persistence both precede story selection',()=>{
 const h=harness({received:greeting('1:1:0')});h.setFail(true);
 assert.equal(h.complete(),false);assert.equal(h.reads,0);assert.equal(h.confirm,null);
 h.setFail(false);h.retry();assert.equal(h.reads,0);assert.equal(h.stories,0);assert.equal(h.advances,0);
 assert.equal(h.snapshots[0].slots[0].activeRun.narrativeState,undefined);
 h.confirm();assert.equal(h.reads,1);assert.equal(h.stories,1);assert.equal(h.advances,0);
 assert.equal(h.repository.load().slots[0].activeRun.narrativeState.pending.kind,'greeting');
 assert.throws(()=>beginAction(h.profile,1,'1:1:1'));
});
test('reloading after result save resolves the saved activity once and preserves its day and stamina',()=>{
 const h=harness({received:greeting('1:1:0')});h.complete();
 const loaded=h.repository.load(),run=loaded.slots[0].activeRun;let reads=0,shown=0;
 const flow=flowApi.createPostActivityStoryFlow({current:()=>run,save:next=>{h.repository.save(loaded);next();return true;},receive:()=>{reads++;return greeting('1:1:0');},onStory:()=>shown++,onContinue(){}});
 flow.resume();flow.resume();assert.equal(reads,1);assert.equal(shown,2);
 assert.equal(run.day,1);assert.equal(run.stamina,85);assert.equal(run.pendingActivityStory,undefined);
 finishNarrative(run);assert.equal(run.storyState.encounters.CH16.encounterCount,1);
 assert.equal(run.narrativeState.history.length,0);assert.equal(finishNarrative(run),false);
 h.repository.save(loaded);assert.doesNotThrow(()=>validateProfile(h.repository.load()));
});
test('a failed scene-boundary save cannot display the scene or advance, and retry uses the same decision',()=>{
 const h=harness({received:greeting('1:1:0')});h.complete();h.setFail(true);h.confirm();
 assert.equal(h.reads,1);assert.equal(h.stories,0);assert.equal(h.advances,0);
 assert.equal(h.flow.resume(),false);assert.equal(h.stories,0);assert.equal(h.reads,1);
 assert.ok(h.repository.load().slots[0].activeRun.pendingActivityStory);
 h.setFail(false);h.retry();assert.equal(h.reads,1);assert.equal(h.stories,1);
});
test('no supplied decision proceeds without inventing a greeting and cannot be selected again on resume',()=>{
 const h=harness();h.complete();h.confirm();assert.equal(h.reads,1);assert.equal(h.advances,1);
 h.flow.resume();assert.equal(h.reads,1);assert.equal(h.run.storyState,undefined);assert.equal(h.run.narrativeState,undefined);
});
test('Friday waits for its separate greeting, which does not count as a weekly story or another activity',()=>{
 const h=harness({friday:true,received:greeting('1:1:4')});h.complete();
 assert.throws(()=>finishWeek(h.profile,1));h.confirm();assert.throws(()=>finishWeek(h.profile,1));
 finishNarrative(h.run);assert.equal(h.run.actionHistory.length,5);assert.equal(h.run.day,5);
 finishWeek(h.profile,1);assert.equal(h.run.week,2);assert.doesNotThrow(()=>validateProfile(h.profile));
});
test('skipped and unregistered greetings cannot manufacture a prior encounter',()=>{
 for(const skip of [true,false]){
  const received=greeting('1:1:0');if(!skip)delete received.content;
  const h=harness({received});h.complete();h.confirm();
  if(skip)dismissNarrative(h.run);else assert.equal(finishNarrative(h.run),false);
  assert.equal(h.run.storyState,undefined);assert.equal(h.run.narrativeState.pending,null);
 }
});
test('player greetings, stale decisions and interrupted activities cannot create a new encounter',()=>{
 for(const received of [{...greeting('1:1:0'),npcId:'CH01'},greeting('1:1:4')]){
  const h=harness({received});h.complete();h.confirm();assert.equal(h.stories,0);assert.equal(h.advances,1);
 }
 const profile=createProfile(),run=startRun(profile,1,'CH01');setSchedule(profile,1,['adventure','rest','rest','rest','rest']);beginAction(profile,1,'1:1:0');recoverInterruptedAction(profile,1);
 let reads=0,advances=0;const flow=flowApi.createPostActivityStoryFlow({current:()=>run,save:next=>{next();return true;},receive:()=>reads++,onStory(){},onContinue:()=>advances++});
 flow.resume();assert.equal(reads,0);assert.equal(advances,1);assert.equal(narrativeCandidates(run,run.actionHistory[0]).length,0);
});
test('fairy trade can lead to a separate greeting without charging stamina twice',()=>{
 const h=harness({action:'fairy-trade',received:greeting('1:1:0')});h.complete();h.confirm();finishNarrative(h.run);
 assert.equal(h.run.stamina,100);assert.equal(h.run.day,1);assert.equal(h.run.storyState.encounters.CH16.encounterCount,1);
});
test('a delivered location story is selected only after saving and commits its actual choice once',()=>{
 const received={activityToken:'1:1:0',eventId:'LOC_OBS_01',content:{lines:[{text:'테스트 원고'}],choices:[{id:'look',label:'살핀다',reaction:'테스트 반응',growth:{knowledge:2}}],closing:'테스트 합류'}};
 const h=harness({received});h.run.week=3;h.run.actionHistory[0].week=3;h.activity.week=3;
 h.run.actionHistory[0].locationId='observatory';h.run.scheduleLocations[0]='observatory';received.activityToken='1:3:0';
 const before=h.run.stats.knowledge;h.complete();assert.equal(h.run.narrativeState,undefined);h.confirm();
 assert.equal(h.run.narrativeState.pending.id,'LOC_OBS_01');assert.equal(h.stories,1);
 assert.equal(finishNarrative(h.run,'look'),true);assert.equal(h.run.stats.knowledge,before+2);
 assert.equal(finishNarrative(h.run,'look'),false);assert.equal(h.run.day,1);assert.doesNotThrow(()=>validateProfile(h.profile));
});
test('normal NPC story completion records the meeting without a second weekday or repeated grant',()=>{
 const h=harness();h.run.week=12;h.activity.week=12;h.run.storyState={encounters:{NPC_LULU:{encounterCount:1,lastEncounterWeek:1,lastToken:'1:1:0'}},storyProgress:{},eventFlags:{},history:[],pending:null};
 const received={activityToken:'1:12:0',eventId:'NPC_LULU_01',content:{lines:[{text:'검증 원고'}]}};
 // Use the same injected flow with the delivered decision, not an invented selection.
 const flow=flowApi.createPostActivityStoryFlow({current:()=>h.run,save:next=>{h.repository.save(h.profile);next();return true;},receive:()=>received,onStory(){},onContinue(){}});
 flow.complete(h.activity);finishNarrative(h.run);
 assert.equal(h.run.storyState.encounters.NPC_LULU.encounterCount,2);assert.equal(h.run.day,1);
 assert.equal(finishNarrative(h.run),false);assert.equal(h.run.storyState.encounters.NPC_LULU.encounterCount,2);
 assert.doesNotThrow(()=>validateProfile(h.profile));
});
test('forged or stale post-activity selection markers are rejected without modifying the save',()=>{
 const h=harness();h.complete();assert.throws(()=>beginAction(h.profile,1,'1:1:1'));
 for(const patch of [{activityToken:'1:1:1'},{activityToken:h.token,extra:true}]){
  const corrupted=structuredClone(h.profile);corrupted.slots[0].activeRun.pendingActivityStory=patch;
  const before=structuredClone(corrupted);assert.throws(()=>validateProfile(corrupted));assert.deepEqual(corrupted,before);
 }
});
test('greetings remain available after two weekly stories and do not add a third story',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');run.week=16;run.mainStory.pendingId=null;
 run.storyState={encounters:{CH25:{encounterCount:1,lastEncounterWeek:1,lastToken:'1:1:0'}},storyProgress:{},eventFlags:{},history:[],pending:null};
 setSchedule(profile,1,['rune-circuit','rune-circuit','adventure','rest','rest']);
 let received;const flow=flowApi.createPostActivityStoryFlow({current:()=>run,save:next=>{validateProfile(profile);next();return true;},receive:()=>received,onStory(){},onContinue(){}});
 for(const [day,eventId] of [[0,'NPC_WORK_01'],[1,'LOC_WRK_01']]){
  beginAction(profile,1,`1:16:${day}`);applyAction(profile,1,`1:16:${day}`,createMinigameResult({gameId:'rune-circuit',locationId:'workshop',difficulty:1,seed:'weekly-stories'},'success',5,100));
  received={activityToken:`1:16:${day}`,eventId,content:{lines:[{text:'검증 원고'}]}};
  flow.complete(run.actionHistory.at(-1));finishNarrative(run);
 }
 beginAction(profile,1,'1:16:2');applyAction(profile,1,'1:16:2',{gameId:'adventure',outcome:'complete'});
 received=greeting('1:16:2');flow.complete(run.actionHistory.at(-1));
 assert.equal(run.narrativeState.pending.kind,'greeting');finishNarrative(run);
 assert.equal(run.narrativeState.history.length,2);assert.equal(run.storyState.encounters.CH16.encounterCount,1);assert.equal(run.day,3);
 assert.doesNotThrow(()=>validateProfile(profile));
});
test('failed greeting completion persistence retries its one meeting without a second day',()=>{
 const h=harness({received:greeting('1:1:0')});h.complete();h.confirm();
 const before=h.repository.load();finishNarrative(h.run);
 let failed=true;const writer=createBoundaryWriter({save:value=>{if(failed)throw new Error('full');h.repository.save(value);}});
 assert.throws(()=>writer.save(h.profile,1));assert.ok(h.repository.load().slots[0].activeRun.narrativeState.pending);
 failed=false;writer.retry();const restored=h.repository.load().slots[0].activeRun;
 assert.equal(restored.storyState.encounters.CH16.encounterCount,1);assert.equal(restored.day,1);assert.equal(restored.stamina,85);
 assert.equal(restored.narrativeState.pending,null);assert.equal(before.slots[0].activeRun.storyState,undefined);
});
