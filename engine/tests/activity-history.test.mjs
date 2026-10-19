import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyActivityRecords} from '../src/core/activity-history.mjs';
import * as history from '../src/core/activity-history.mjs';
import {createProfile,startRun,setSchedule,finishWeek} from '../src/core/state.mjs';
import {runAction as applyAction} from './activity-helpers.mjs';
import {createLocalRepository,createBoundaryWriter} from '../src/core/storage.mjs';
import {calendarModel} from '../src/core/preview.mjs';
test('server weekly class detail uses completed records for that week only',()=>{
 const stored={week:2,statDelta:{knowledge:0,expression:0,skill:0,exploration:0,magic:0},classCount:2,staminaSpent:20,staminaRecovered:0,startingStamina:100,endingStamina:80,forcedRestDays:0};
 const rows=[{week:2,action:'rune-circuit',status:'COMPLETED'},{week:2,action:'rune-circuit',status:'COMPLETED'},{week:2,action:'rune-circuit',status:'INTERRUPTED'},{week:1,action:'starlight-stage',status:'COMPLETED'}];
 assert.deepEqual(history.projectServerWeeklySummary(stored,rows).classCounts,{'rune-circuit':2});
 assert.deepEqual(history.projectServerWeeklySummary({...stored,classCount:3},rows).classCounts,{},'do not invent incomplete detail');
});
test('story diary includes Main stories and all supplied choices without changing saved records',()=>{
 assert.equal(typeof history.storyDiaryRecords,'function');
 const run={mainStory:{history:[{id:'MS01',week:1,selectedChoices:[{choiceNodeId:'C1',choiceId:'A'},{choiceNodeId:'C2',choiceId:'B'}]}]},narrativeState:{history:[{id:'LOC_OBS_01',week:3,day:1,choiceId:'C'}]}};
 const before=structuredClone(run),records=history.storyDiaryRecords(run);
 assert.equal(records.length,2);assert.equal(records[0].id,'LOC_OBS_01');assert.equal(records[1].kind,'main');assert.equal(records[1].selectedChoices.length,2);
 assert.equal(records[1].title,'각자의 이유로 아카데미에');assert.deepEqual(run,before);
});
test('weekly summary includes server dialogue growth once when the main story also has a completion record',()=>{
 const run={mainStory:{history:[{id:'MS01',week:1,effect:{growth:{knowledge:2}}}]},dialogueHistory:[{eventId:'MS01',week:1,day:0,title:'입학',effect:{growth:{knowledge:2}}},{eventId:'LOC_GH_01',week:1,day:2,title:'온실',effect:{growth:{dexterity:1}}}]};
 const summary=history.createWeeklySummary([],1,history.storyDiaryRecords(run));
 assert.equal(summary.statChanges.knowledge,2);assert.equal(summary.statChanges.dexterity,1);
});
test('server weekly summary displays the saved five-day totals after the schedule resets',()=>{
 const stored={week:1,statDelta:{knowledge:5,expression:1,skill:2,exploration:0,magic:0},classCount:1,staminaSpent:10,staminaRecovered:10,startingStamina:100,endingStamina:100,forcedRestDays:0};
 const summary=history.projectServerWeeklySummary(stored);
 assert.equal(summary.activityCount,5);
 assert.equal(summary.statChanges.dexterity,2);
 assert.equal(summary.classCount,1);
 assert.equal(summary.staminaAtStart,100);
 assert.equal(summary.staminaAtEnd,100);
 assert.equal(history.projectServerWeeklySummary({...stored,statDelta:{...stored.statDelta,skill:'2'}}),null);
});
test('weekly diary groups actual completed activities without filling missing days or changing saved history',()=>{
 const history=[{week:2,day:2,action:'adventure'},{week:1,day:4,action:'rest'},{week:2,day:0,action:'rune-link'}],before=structuredClone(history);
 assert.deepEqual(weeklyActivityRecords(history),[{week:1,activities:[history[1]]},{week:2,activities:[history[2],history[0]]}]);
 assert.deepEqual(history,before);assert.deepEqual(weeklyActivityRecords(),[]);
});
test('continue restores completed week in both calendar and weekly diary after boundary save',()=>{
 let stored=null;const repository=createLocalRepository({getItem:()=>stored,setItem:(_,value)=>{stored=value;}}),writer=createBoundaryWriter(repository),profile=createProfile();
 startRun(profile,1,'CH01');writer.save(profile,1);setSchedule(profile,1,Array(5).fill('rest'));
 for(let day=0;day<5;day++)applyAction(profile,1,'1:1:'+day);
 finishWeek(profile,1);writer.save(profile,1);
 const resumed=repository.load().slots[0].activeRun;
 assert.equal(resumed.week,2);assert.equal(weeklyActivityRecords(resumed.actionHistory)[0].activities.length,5);
 assert.equal(calendarModel(resumed).cells.filter(c=>c.pastAction==='rest').length,5);
});
