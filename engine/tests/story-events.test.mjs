import test from 'node:test';
import assert from 'node:assert/strict';
import {selectAdventureNpcs,recordAdventureEncounters,queueActivityStory,completeStoryEvent,storyContent,validateStoryState} from '../src/core/story-events.mjs';
import {createProfile,startRun,setSchedule,finishWeek,beginAction} from '../src/core/state.mjs';
import {runAction} from './activity-helpers.mjs';
import {validateProfile,createLocalRepository,createBoundaryWriter} from '../src/core/storage.mjs';

const context=(day=0,locationId='greenhouse',week=1)=>({action:'adventure',week,day,locationId});
function run(){return {runNumber:1,characterId:'CH01',week:1,flags:{},actionHistory:[{...context(),status:'COMPLETED'}]};}
test('adventure NPCs exclude the player, have no duplicates and wait for admission completion',()=>{
 const r=run();const first=selectAdventureNpcs(r,'greenhouse','seed');
 assert.ok(first.length>=1&&first.length<=2);assert.ok(first.every(n=>n.id!=='CH01'));
 assert.equal(new Set(first.map(n=>n.id)).size,first.length);assert.deepEqual(selectAdventureNpcs(r,'greenhouse','seed'),first);
 r.flags.admissionPending=true;assert.deepEqual(selectAdventureNpcs(r,'greenhouse','seed'),[]);
});
test('only completed map greetings count and repeated result delivery cannot count them twice',()=>{
 const r=run();recordAdventureEncounters(r,['CH16','CH16','CH01'],context());
 recordAdventureEncounters(r,['CH16'],context());
 assert.equal(r.storyState.encounters.CH16.encounterCount,1);assert.equal(r.storyState.encounters.CH16.lastEncounterWeek,1);
 assert.equal(r.storyState.encounters.CH01,undefined);
});
test('NPC story requires a prior encounter and commits only after neutral choice follow-up completes',()=>{
 const r=run();recordAdventureEncounters(r,['CH16'],context());
 const event=queueActivityStory(r,context());assert.equal(event.kind,'npc');
 const content=storyContent(event);assert.ok(content.previewOnly);assert.equal(content.choices.length,2);
 assert.equal(r.storyState.history.length,0);assert.equal(r.storyState.storyProgress[event.storyId],undefined);
 const before=structuredClone(r);assert.throws(()=>completeStoryEvent(r,{eventId:event.eventId,choiceId:'invalid'}));assert.deepEqual(r,before);
 assert.equal(completeStoryEvent(r,{eventId:event.eventId,choiceId:'leave'}),true);
 assert.equal(r.storyState.storyProgress[event.storyId].step,1);assert.equal(r.storyState.history[0].choiceId,'leave');
 assert.equal(completeStoryEvent(r,{eventId:event.eventId,choiceId:'leave'}),false);
});
test('stories share the two-per-week and one-per-day limits and do not repeat completed one-shots',()=>{
 const r=run(),first=queueActivityStory(r,context());completeStoryEvent(r,{eventId:first.eventId,choiceId:'look'});
 assert.equal(queueActivityStory(r,context(0,'library')),null);
 assert.equal(queueActivityStory(r,context(1)),null);
 const second=queueActivityStory(r,context(1,'library'));assert.ok(second);completeStoryEvent(r,{eventId:second.eventId,choiceId:'look'});
 assert.equal(queueActivityStory(r,context(2,'observatory')),null);
});
test('NPC story steps obey the weekly limit and skip the following week while greetings stay available',()=>{
 const r=run();recordAdventureEncounters(r,['CH16'],context());const first=queueActivityStory(r,context());completeStoryEvent(r,{eventId:first.eventId,choiceId:'look'});
 const sameWeek=queueActivityStory(r,context(1));assert.notEqual(sameWeek?.storyId,first.storyId);
 if(sameWeek)completeStoryEvent(r,{eventId:sameWeek.eventId,choiceId:'look'});
 r.week=2;assert.notEqual(queueActivityStory(r,context(0,'greenhouse',2))?.storyId,first.storyId);
 assert.ok(selectAdventureNpcs(r,'greenhouse','another').length>0);
 r.week=3;recordAdventureEncounters(r,['CH16'],context(0,'greenhouse',3));assert.equal(queueActivityStory(r,context(0,'greenhouse',3))?.step,2);
});
test('pending stories and completed choices survive local saving without altering dates, stats or rewards',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');setSchedule(p,1,['adventure','rest','rest','rest','rest']);runAction(p,1,'1:1:0',{gameId:'adventure',outcome:'complete'});
 const event=queueActivityStory(r,context()),snapshot={day:r.day,stamina:r.stamina,stats:structuredClone(r.stats),meta:structuredClone(p.meta)};
 let raw;const repository=createLocalRepository({getItem:()=>raw??null,setItem:(_,value)=>{raw=value;}});repository.save(p);
 const resumed=repository.load(),resumedRun=resumed.slots[0].activeRun;assert.equal(resumedRun.storyState.pending.eventId,event.eventId);
 completeStoryEvent(resumedRun,{eventId:event.eventId,choiceId:'look'});repository.save(resumed);
 assert.equal(resumedRun.day,snapshot.day);assert.equal(resumedRun.stamina,snapshot.stamina);assert.deepEqual(resumedRun.stats,snapshot.stats);assert.deepEqual(resumed.meta,snapshot.meta);
 assert.doesNotThrow(()=>validateProfile(resumed));resumedRun.storyState.history[0].choiceId='corrupt';assert.throws(()=>validateProfile(resumed));
});
test('malformed story state is rejected without normalizing or deleting it',()=>{
 const state={encounters:[],history:[],pending:null};const before=structuredClone(state);
 assert.throws(()=>validateStoryState(state));assert.deepEqual(state,before);
});
test('a failed story save retries the completed choice without consuming another day',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');setSchedule(p,1,['adventure','rest','rest','rest','rest']);runAction(p,1,'1:1:0',{gameId:'adventure',outcome:'complete'});
 const event=queueActivityStory(r,context());let raw,fail=false;
 const repository=createLocalRepository({getItem:()=>raw??null,setItem:(_,value)=>{if(fail)throw new Error('disk full');raw=value;}}),writer=createBoundaryWriter(repository);
 writer.save(p,1);assert.throws(()=>beginAction(p,1,'1:1:1'));assert.equal(beginAction(p,1,'1:1:0'),false);completeStoryEvent(r,{eventId:event.eventId,choiceId:'leave'});fail=true;
 assert.throws(()=>writer.save(p,1));assert.equal(repository.load().slots[0].activeRun.storyState.pending.eventId,event.eventId);
 fail=false;writer.retry();const restored=repository.load().slots[0].activeRun;
 assert.equal(restored.day,1);assert.equal(restored.storyState.pending,null);assert.equal(restored.storyState.history.length,1);
 assert.equal(completeStoryEvent(restored,{eventId:event.eventId,choiceId:'leave'}),false);
});
test('Friday stories finish before week rollover and forged activity references are rejected',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');setSchedule(p,1,['rest','rest','rest','rest','adventure']);
 for(let day=0;day<4;day++)runAction(p,1,`1:1:${day}`);
 runAction(p,1,'1:1:4',{gameId:'adventure',outcome:'complete'});const event=queueActivityStory(r,context(4));
 assert.throws(()=>finishWeek(p,1));assert.doesNotThrow(()=>validateProfile(p));
 const forged=structuredClone(p);forged.slots[0].activeRun.storyState.pending.day=3;assert.throws(()=>validateProfile(forged));
 completeStoryEvent(r,{eventId:event.eventId,choiceId:'look'});finishWeek(p,1);assert.equal(r.week,2);assert.doesNotThrow(()=>validateProfile(p));
});
