import test from 'node:test';
import assert from 'node:assert/strict';
import {selectCareerEnding,ENDING_CAREERS} from '../src/core/ending-system.mjs';
import {createProfile,startRun,prepareEnding,completeRun} from '../src/core/state.mjs';
import {validateProfile} from '../src/core/storage.mjs';

const defaults=()=>({stats:{knowledge:50,expression:50,dexterity:50,exploration:50,magic:50},hiddenStats:{},actionHistory:[],storyState:{history:[]}});

test('career ending master contains ten authored careers and a separate fallback',()=>{
 assert.equal(ENDING_CAREERS.length,10);
 assert.ok(ENDING_CAREERS.every(c=>c.requiredStat&&c.requiredValue===300&&c.optionalConditions.length===3));
});

test('fallback is selected only when no career required visible stat reaches 300',()=>{
 const result=selectCareerEnding(defaults(),{seenEndings:[]},()=>0);
 assert.equal(result.career.id,'ENDING_STARPATH_PIONEER');assert.equal(result.type,'FALLBACK');
});

test('unseen qualified career wins by fit, then representative record, then representative stat',()=>{
 const run=defaults();run.stats.magic=360;run.stats.knowledge=340;run.hiddenStats.curiosity=45;run.actionHistory=Array.from({length:42},(_,day)=>({week:1,day:day%5,action:'rune-circuit',status:'COMPLETED'}));
 const result=selectCareerEnding(run,{seenEndings:[]},()=>0);
 assert.equal(result.career.id,'ENDING_RUNE_RESEARCHER');
});

test('when every qualified ending was already seen, selection is random across all qualified candidates',()=>{
 const run=defaults();run.stats.magic=300;run.stats.exploration=300;run.stats.knowledge=200;run.hiddenStats.curiosity=40;
 const result=selectCareerEnding(run,{seenEndings:['ENDING_RUNE_RESEARCHER','ENDING_ARCADIA_EXPLORER','ENDING_ARCANE_ARTISAN','ENDING_MAGICAL_CREATURE_KEEPER']},()=>.99);
 assert.equal(result.career.id,'ENDING_MAGICAL_CREATURE_KEEPER');
});

test('career labels preserve the authoritative writer names',()=>{
 assert.equal(ENDING_CAREERS.find(c=>c.id==='ENDING_ARCANE_ARTISAN').name,'마도 장인');
 assert.equal(ENDING_CAREERS.find(c=>c.id==='ENDING_ACADEMY_GUARDIAN').name,'아카데미 수호 기사');
 assert.equal(ENDING_CAREERS.find(c=>c.id==='ENDING_ARCHIVIST').name,'아카이브 기록관');
});

test('ending condition labels are readable Korean and keep unavailable special discoveries unknown',()=>{
 const run=defaults();run.stats.dexterity=300;run.hiddenStats.empathy=50;run.actionHistory=Array.from({length:40},()=>({action:'adventure',status:'COMPLETED'}));
 const result=selectCareerEnding(run,{seenEndings:[]},()=>0);
 assert.equal(result.career.id,'ENDING_HERB_GARDENER');
 assert.ok(result.checks.some(check=>check.condition.label==='공감'));
 assert.ok(result.checks.some(check=>check.condition.key==='adventures'&&check.value===40));
 assert.ok(result.records.some(record=>record.key==='specialItemDiscoveries'&&record.value===null));
});

test('ending summary uses only recorded counters and marks missing metrics as unavailable',()=>{
 const run=defaults();run.actionHistory=[{week:1,day:0,action:'adventure',status:'COMPLETED'}];
 const result=selectCareerEnding(run,{seenEndings:[]},()=>0);
 assert.ok(result.records.every(record=>Number.isFinite(record.value)||record.value===null));
});

test('prepared ending survives save and the run completes only after final confirmation',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');run.week=52;run.day=5;run.phase='AWAITING_ENDING';run.schedule=['rest','rest','rest','rest','rest'];run.scheduleLocations=Array(5).fill(null);run.pendingWeekSummaryWeek=undefined;run.mainStory.pendingId=null;run.mainStory.completedIds=['MS01','MS02','MS03','MS04','MS05','MS06'];
 const prepared=prepareEnding(profile,1,()=>0);assert.equal(prepared.type,'FALLBACK');assert.equal(profile.slots[0].status,'PLAYING');
 validateProfile(profile);const final=completeRun(profile,1);assert.equal(final.careerId,'ENDING_STARPATH_PIONEER');assert.equal(profile.slots[0].status,'RUN_COMPLETE');assert.equal(profile.slots[0].completedRunCount,1);
 assert.equal(profile.meta.seenEndings.length,0);assert.equal(profile.meta.endingViewCounts.ENDING_STARPATH_PIONEER,1);validateProfile(profile);
});
