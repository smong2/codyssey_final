import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,startRun,setSchedule,beginAction,applyAction} from '../src/core/state.mjs';
import {validAction} from '../src/core/classes.mjs';

test('fairy trade is a valid zero-stamina special schedule action',()=>{
 assert.equal(validAction('fairy-trade'),true);
 const profile=createProfile(),run=startRun(profile,1,'CH01');run.stats.knowledge=180;run.stats.exploration=145;
 setSchedule(profile,1,['fairy-trade','rest','rest','rest','rest']);
 const checkpoint=beginAction(profile,1,'1:1:0');assert.equal(checkpoint.staminaCost,0);
 applyAction(profile,1,'1:1:0',{transfer:{from:'knowledge',to:'exploration',amount:5}});
 assert.equal(run.stats.knowledge,175);assert.equal(run.stats.exploration,150);assert.equal(run.day,1);
 assert.equal(run.actionHistory[0].effect.outcome,'transferred');
});

test('fairy trade can be skipped once weekly and never changes the total',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');setSchedule(profile,1,['fairy-trade','rest','rest','rest','rest']);
 beginAction(profile,1,'1:1:0');applyAction(profile,1,'1:1:0',{skip:true});
 assert.equal(run.actionHistory[0].effect.outcome,'skipped');
 assert.throws(()=>setSchedule(profile,1,['fairy-trade','fairy-trade','rest','rest','rest']));
});

test('fairy trade validates bounds, same-stat transfers and growth total conservation',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');run.stats.knowledge=1;run.stats.magic=499;setSchedule(profile,1,['fairy-trade','rest','rest','rest','rest']);beginAction(profile,1,'1:1:0');
 assert.throws(()=>applyAction(profile,1,'1:1:0',{transfer:{from:'knowledge',to:'knowledge',amount:1}}));
 assert.throws(()=>applyAction(profile,1,'1:1:0',{transfer:{from:'knowledge',to:'magic',amount:5}}));
 applyAction(profile,1,'1:1:0',{transfer:{from:'knowledge',to:'magic',amount:1}});
 assert.equal(Object.values(run.stats).reduce((a,b)=>a+b,0),650);
});
