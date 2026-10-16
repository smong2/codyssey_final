import test from 'node:test';
import assert from 'node:assert/strict';
import * as state from '../src/core/state.mjs';
import {runAction} from './activity-helpers.mjs';
import * as preview from '../src/core/preview.mjs';
import * as historyModel from '../src/core/activity-history.mjs';
import {createLocalRepository,createBoundaryWriter} from '../src/core/storage.mjs';

test('an activity without a chosen date fills the earliest open weekday and skips forced rest',()=>{
 const profile=state.createProfile();state.startRun(profile,1,'CH01');const run=profile.slots[0].activeRun;run.stamina=9;
 const draft=['rest','rest','rest',null,null];
 assert.equal(preview.assignScheduleActivity(run,draft,'rune-circuit'),3);
 assert.deepEqual(draft,['rest','rest','rest','rune-circuit',null]);
});

test('choosing a weekday first assigns or replaces only that weekday',()=>{
 const profile=state.createProfile();state.startRun(profile,1,'CH01');const run=profile.slots[0].activeRun;
 const draft=['rune-circuit',null,null,null,null];
 assert.equal(preview.assignScheduleActivity(run,draft,'adventure',0),0);
 assert.deepEqual(draft,['adventure',null,null,null,null]);
 assert.equal(preview.assignScheduleActivity(run,draft,'rune-link',null),1);
 assert.deepEqual(draft,['adventure','rune-link',null,null,null]);
});

test('weekly summary derives stat, class, stamina and forced-rest totals from saved history',()=>{
 const history=[
  {week:3,day:0,action:'rune-circuit',status:'COMPLETED',effect:{growth:{magic:5},staminaChange:-10,staminaAfter:90,forcedRest:false,forcedRestDays:0}},
  {week:3,day:1,action:'adventure',status:'COMPLETED',effect:{growth:{exploration:3},staminaChange:-15,staminaAfter:75,forcedRest:false,forcedRestDays:0}},
  {week:3,day:2,action:'rest',status:'COMPLETED',effect:{growth:{},staminaChange:25,staminaAfter:100,restRecovery:25,forcedRest:false,forcedRestDays:0}},
  {week:3,day:3,action:'rest',status:'COMPLETED',effect:{growth:{},staminaChange:0,staminaAfter:100,forcedRest:true,forcedRestDays:1}},
  {week:4,day:0,action:'rune-link',status:'COMPLETED',effect:{growth:{knowledge:7},staminaChange:-10,staminaAfter:90,forcedRest:false,forcedRestDays:0}}
 ];
 assert.deepEqual(historyModel.createWeeklySummary(history,3),{
  week:3,activityCount:4,statChanges:{knowledge:0,expression:0,dexterity:0,exploration:3,magic:5},classCount:1,classCounts:{'rune-circuit':1},
  staminaSpent:25,staminaRecovered:25,staminaAtStart:100,staminaAtEnd:100,forcedRestDays:1
 });
});

test('the next week stays locked behind a persisted weekly summary acknowledgement',()=>{
 let saved=null;const repo=createLocalRepository({getItem:()=>saved,setItem:(_,value)=>{saved=value;}}),writer=createBoundaryWriter(repo);
 const profile=state.createProfile();state.startRun(profile,1,'CH01');state.setSchedule(profile,1,Array(5).fill('rest'));
 for(let day=0;day<5;day++)runAction(profile,1,'1:1:'+day,undefined,()=>0);
 state.finishWeek(profile,1);writer.save(profile,1);
 let resumed=repo.load().slots[0].activeRun;
 assert.equal(resumed.week,2);assert.equal(resumed.pendingWeekSummaryWeek,1);
 assert.throws(()=>state.setSchedule(repo.load(),1,Array(5).fill('rest')));
 state.acknowledgeWeekSummary(repo.load(),1);writer.save(repo.load(),1);
 resumed=repo.load().slots[0].activeRun;assert.equal(resumed.pendingWeekSummary,undefined);
});

test('week 52 retains its final summary before entering the ending flow',()=>{
 const profile=state.createProfile();state.startRun(profile,1,'CH01');const run=profile.slots[0].activeRun;
 run.week=52;run.schedule=Array(5).fill('rest');run.day=5;run.phase='WEEK_COMPLETE';run.actionHistory=[];
 state.finishWeek(profile,1);
 assert.equal(run.week,52);assert.equal(run.phase,'AWAITING_ENDING');assert.equal(run.pendingWeekSummaryWeek,52);
 state.acknowledgeWeekSummary(profile,1);assert.equal(run.pendingWeekSummary,undefined);
});
