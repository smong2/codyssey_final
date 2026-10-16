import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASSES,classOf} from '../src/core/classes.mjs';
import {curriculumStart,curriculumOutcome,curriculumResult,normalizeCurriculumResult} from '../src/core/curriculum.mjs';
test('the six authored subjects cover their exact places and stats while old schedules remain readable',()=>{
 assert.deepEqual(CLASSES.map(c=>[c.locationCode,c.stat]),[['OBS','exploration'],['CLK','expression'],['GH','knowledge'],['LIB','knowledge'],['WRK','magic'],['TRN','dexterity']]);
 assert.equal(classOf('mirror-magic').stat,'magic');assert.equal(classOf('excavation').stat,'exploration');
});
test('all six courses retain reward difficulty while reporting explicit outcome and end reason',()=>{
 for(const lesson of CLASSES){const start=curriculumStart({gameId:lesson.id,statValue:250,seed:'same',consecutiveFailures:2});
  assert.equal(start.rewardDifficulty,'HARD');assert.equal(start.playDifficulty,'NORMAL');assert.equal(start.assistLevel,1);
  const result=curriculumResult(start,{endReason:'QUIT'});assert.equal(result.outcome,'FAIL');assert.equal(result.endReason,'QUIT');
  assert.equal(normalizeCurriculumResult(result,lesson,{rewardDifficulty:3,playDifficulty:2}).outcome,'failure');
  assert.throws(()=>normalizeCurriculumResult({...result,targetStat:'invalid'},lesson,{rewardDifficulty:3,playDifficulty:2}));
 }
});

test('assistance records the requested level even at the EASY floor and new courses require v2 results',async()=>{
 const start=curriculumStart({gameId:'spirit-pot-sort',statValue:50,seed:'floor',consecutiveFailures:4});
 assert.equal(start.playDifficulty,'EASY');assert.equal(start.assistLevel,2);
 const {createProfile,startRun,setSchedule,beginAction,applyAction}=await import('../src/core/state.mjs');
 const p=createProfile(),r=startRun(p,1,'CH01');r.consecutiveFails={'spirit-pot-sort':4};setSchedule(p,1,Array(5).fill('spirit-pot-sort'));beginAction(p,1,'1:1:0');
 const value=curriculumResult(start,{endReason:'QUIT'});const legacy={...value,contractVersion:undefined,outcome:'failure',rewardDifficulty:1};
 assert.throws(()=>applyAction(p,1,'1:1:0',legacy));assert.equal(r.day,0);
 assert.equal(applyAction(p,1,'1:1:0',value),true);assert.equal(r.day,1);assert.equal(r.consecutiveFails['spirit-pot-sort'],5);
});
test('great and success use authored thresholds; timeout never silently becomes success',()=>{
 assert.equal(curriculumOutcome('starlight-stage',{total:100,hits:90}),'GREAT');
 assert.equal(curriculumOutcome('starlight-stage',{total:100,hits:65}),'SUCCESS');
 assert.equal(curriculumOutcome('starlight-stage',{total:100,hits:64}),'FAIL');
 assert.equal(curriculumOutcome('spirit-pot-sort',{solved:true,moves:10,greatMoveLimit:10}),'GREAT');
 assert.equal(curriculumOutcome('sealed-shelves',{roundsCleared:3,moves:20,greatMoveLimit:19}),'SUCCESS');
 assert.equal(curriculumOutcome('rune-pin-training',{roundsCleared:3,mistakes:1}),'GREAT');
 assert.equal(curriculumOutcome('rune-circuit',{roundsCleared:3},20000),'GREAT');
 assert.equal(curriculumOutcome('rune-circuit',{roundsCleared:3},19999),'SUCCESS');
 assert.equal(curriculumOutcome('rune-circuit',{roundsCleared:3},50000,'TIMEOUT'),'FAIL');
});

test('every course saves designated growth and independent failure counts without changing legacy history',async()=>{
 const {createProfile,startRun,setSchedule,beginAction,applyAction}=await import('../src/core/state.mjs');const {validateProfile}=await import('../src/core/storage.mjs');
 for(const lesson of CLASSES){const p=createProfile(),r=startRun(p,1,'CH01');r.stats[lesson.stat]=250;r.consecutiveFails={'other-course':3};setSchedule(p,1,[lesson.id,'rest','rest','rest','rest']);const checkpoint=beginAction(p,1,'1:1:0');
  const start=curriculumStart({gameId:lesson.id,statValue:250,seed:'save-test'}),metrics={roundsCleared:3,mistakes:0,solved:true,moves:1,greatMoveLimit:5,hits:100,total:100},result=curriculumResult(start,{metrics,remainingMs:30000});
  assert.equal(result.outcome,'GREAT');assert.equal(checkpoint.staminaCost,10);applyAction(p,1,'1:1:0',result);assert.equal(r.stats[lesson.stat],260);assert.equal(r.stamina,90);assert.equal(r.day,1);assert.equal(r.consecutiveFails['other-course'],3);assert.equal(r.actionHistory[0].stat,lesson.stat);validateProfile(JSON.parse(JSON.stringify(p)));
  assert.equal(applyAction(p,1,'1:1:0',result),false);assert.equal(p.meta.counters.classes,1);
 }
});
