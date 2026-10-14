import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyActivityRecords} from '../src/core/activity-history.mjs';
import {createProfile,startRun,setSchedule,applyAction,finishWeek} from '../src/core/state.mjs';
import {createLocalRepository,createBoundaryWriter} from '../src/core/storage.mjs';
import {calendarModel} from '../src/core/preview.mjs';
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
