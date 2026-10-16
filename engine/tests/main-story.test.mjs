import test from 'node:test';
import assert from 'node:assert/strict';
import {MAIN_STORIES,dueMainStory,completeMainStory} from '../src/core/main-story.mjs';
import {createWeeklySummary} from '../src/core/activity-history.mjs';

test('main story milestones follow the finalized week schedule and do not consume an action',()=>{
 assert.deepEqual(MAIN_STORIES.map(story=>[story.id,story.week]),[['MS01',1],['MS02',10],['MS03',23],['MS04',36],['MS05',49],['MS06',52]]);
 const run={week:10,day:0,mainStory:{completedIds:['MS01'],pendingId:null}};
 assert.equal(dueMainStory(run),'MS02');assert.equal(run.day,0);
});

test('completed or already pending story milestones are not queued again',()=>{
 const run={week:23,day:0,mainStory:{completedIds:['MS01','MS02'],pendingId:'MS03'}};
 assert.equal(dueMainStory(run),'MS03');completeMainStory(run,'MS03');
 assert.equal(dueMainStory(run),null);assert.deepEqual(run.mainStory.completedIds,['MS01','MS02','MS03']);
});

test('MS01 requires an explicit pending record and no invented dialogue is supplied',()=>{
 const run={week:1,mainStory:{completedIds:[],pendingId:'MS01'}};
 assert.equal(dueMainStory(run),'MS01');assert.ok(MAIN_STORIES.every(story=>story.stages.length===5));
 assert.ok(MAIN_STORIES.every(story=>story.stages.every(stage=>stage.dialogue===null)));
});

test('authored story growth is recorded once and included in the weekly stat snapshot',()=>{
 const run={week:10,stats:{knowledge:50,expression:50,dexterity:50,exploration:50,magic:499},mainStory:{completedIds:['MS01'],pendingId:'MS02',history:[]}};
 completeMainStory(run,'MS02',{effect:{growth:{magic:7,knowledge:3}}});
 assert.deepEqual(run.mainStory.history[0].effect.growth,{magic:1,knowledge:3});
 assert.equal(run.stats.magic,500);assert.equal(run.stats.knowledge,53);
 assert.equal(createWeeklySummary([],10,run.mainStory.history).statChanges.magic,1);
 assert.equal(createWeeklySummary([],10,run.mainStory.history).statChanges.knowledge,3);
});
