import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,startRun,setSchedule,finishWeek,acknowledgeWeekSummary} from '../src/core/state.mjs';
import {runAction as applyAction} from './activity-helpers.mjs';
import {createMinigameResult,difficultyForStat} from '../src/core/minigame-contract.mjs';
import {PETS,effectiveStats} from '../src/core/pets.mjs';
import {createLocalRepository,createBoundaryWriter,validateProfile} from '../src/core/storage.mjs';
import {calendarModel,calendarActivity,scheduleDraft,assignScheduleDay,scheduleReady} from '../src/core/preview.mjs';
import {activityResultText} from '../src/core/activity-rules.mjs';

const lessonResult=(run,gameId='rune-circuit',locationId='workshop',stat='magic')=>
 createMinigameResult({gameId,locationId,difficulty:difficultyForStat(run.stats[stat]),seed:'week-loop'},'success',10,100);

test('rest applies one of three recovery results once and records the actual capped change',()=>{
 for(const [sample,stamina,recovery,change] of [[0,10,40,40],[0.5,10,50,50],[0.999,10,70,70],[0.999,90,70,10]]){
  const p=createProfile(),r=startRun(p,1,'CH01');r.stamina=stamina;setSchedule(p,1,Array(5).fill('rest'));
  let calls=0;const random=()=>{calls++;return sample;};
  assert.equal(applyAction(p,1,'1:1:0',undefined,random),true);
  assert.equal(r.stamina,stamina+change);assert.equal(r.day,1);
  assert.equal(r.actionHistory[0].effect.restRecovery,recovery);
  assert.equal(r.actionHistory[0].effect.staminaChange,change);
  assert.equal(applyAction(p,1,'1:1:0',undefined,random),false);assert.equal(calls,1);
 }
});

test('chosen rest gives one random visible stat at most and keeps home rest stamina-only',()=>{
 const home=createProfile(),homeRun=startRun(home,1,'CH01');homeRun.stamina=10;setSchedule(home,1,Array(5).fill('rest'));
 applyAction(home,1,'1:1:0',{restChoice:'HOME'},()=>0);
 assert.equal(homeRun.stamina,70);assert.deepEqual(homeRun.actionHistory[0].effect.growth,{});
 const hobby=createProfile(),hobbyRun=startRun(hobby,1,'CH01');hobbyRun.stamina=10;setSchedule(hobby,1,Array(5).fill('rest'));
 const rolls=[0,0.42];applyAction(hobby,1,'1:1:0',{restChoice:'HOBBY'},()=>rolls.shift());
 assert.equal(hobbyRun.stamina,40);assert.deepEqual(hobbyRun.actionHistory[0].effect.growth,{dexterity:2});
 assert.equal(Object.keys(hobbyRun.actionHistory[0].effect.growth).length,1);
});

test('adventure completion charges 15 once without growth or rewards',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');setSchedule(p,1,['adventure','rest','rest','rest','rest']);
 const before=structuredClone(p);
 assert.throws(()=>applyAction(p,1,'1:1:0',{gameId:'adventure',outcome:'quit'}));assert.equal(r.day,0);assert.equal(r.stamina,85);assert.equal(r.inProgressActivity.status,'IN_PROGRESS');
 applyAction(p,1,'1:1:0',{gameId:'adventure',outcome:'complete'});
 assert.equal(r.stamina,85);assert.equal(r.day,1);assert.equal(p.meta.counters.adventures,1);
 assert.deepEqual(r.stats,before.slots[0].activeRun.stats);assert.deepEqual(p.meta.roomPieces,[]);
 assert.equal(r.actionHistory[0].effect.staminaChange,-15);
 assert.equal(applyAction(p,1,'1:1:0',{gameId:'adventure',outcome:'complete'}),false);assert.equal(r.stamina,85);
});

test('stamina below 10 forces rest before dispatch and only the third weekday restores stamina',()=>{
 for(const stamina of [0,9]){
  const p=createProfile(),r=startRun(p,1,'CH01');r.stamina=stamina;setSchedule(p,1,Array(5).fill('adventure'));
  for(let day=0;day<3;day++){
   applyAction(p,1,`1:1:${day}`);
   assert.equal(r.stamina,day===2?100:stamina);assert.equal(r.forcedRestDays,2-day);
   assert.equal(r.actionHistory[day].action,'rest');assert.equal(r.actionHistory[day].effect.forcedRest,true);
  }
  assert.equal(r.exhausted,false);assert.equal(p.meta.counters.adventures,0);
  applyAction(p,1,'1:1:3',{gameId:'adventure',outcome:'complete'});assert.equal(r.stamina,85);
 }
 const p=createProfile(),r=startRun(p,1,'CH01');r.stamina=10;setSchedule(p,1,Array(5).fill('adventure'));
 applyAction(p,1,'1:1:0',{gameId:'adventure',outcome:'complete'});
 assert.equal(r.day,1);assert.equal(r.stamina,0);assert.equal(r.forcedRestDays,3);
});

test('forced rest spans weekend and resume without weekend recovery or lost remaining weekdays',()=>{
 let raw=null;const repo=createLocalRepository({getItem:()=>raw,setItem:(_,v)=>{raw=v;}}),writer=createBoundaryWriter(repo);
 const p=createProfile(),r=startRun(p,1,'CH01');r.stamina=50;setSchedule(p,1,Array(5).fill('rune-circuit'));
 for(let day=0;day<5;day++)applyAction(p,1,`1:1:${day}`,lessonResult(r));
 assert.equal(r.forcedRestDays,3);finishWeek(p,1);assert.equal(r.stamina,0);assert.equal(r.forcedRestDays,3);
 writer.save(p,1);const loaded=repo.load(),next=loaded.slots[0].activeRun;assert.equal(next.pendingWeekSummaryWeek,1);acknowledgeWeekSummary(loaded,1);
 setSchedule(loaded,1,Array(5).fill('adventure'));
 for(let day=0;day<3;day++)applyAction(loaded,1,`1:2:${day}`);
 assert.equal(next.day,3);assert.equal(next.stamina,100);assert.equal(next.forcedRestDays,0);
 assert.deepEqual(next.actionHistory.slice(-3).map(h=>h.action),['rest','rest','rest']);
 assert.equal(next.actionHistory[4].effect.staminaChange,-10);
 assert.equal(next.actionHistory[7].effect.staminaChange,100);
 assert.equal(repo.load().slots[0].activeRun.day,0);
});

test('weekend neither restores stamina nor consumes forced rest weekdays',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');setSchedule(p,1,Array(5).fill('adventure'));
 for(let day=0;day<5;day++)applyAction(p,1,`1:1:${day}`,{gameId:'adventure',outcome:'complete'});
 assert.equal(r.stamina,25);finishWeek(p,1);assert.equal(r.stamina,25);assert.equal(r.week,2);
 assert.throws(()=>finishWeek(p,1));assert.equal(r.stamina,25);
});

test('effective stats clamp pet bonuses before the low stamina penalty and keep original stats intact',()=>{
 const stats={knowledge:498,expression:50,dexterity:50,exploration:50,magic:500},before=structuredClone(stats);
 assert.deepEqual(effectiveStats(stats,PETS[0],10),{knowledge:350,expression:37,dexterity:35,exploration:35,magic:350});
 assert.deepEqual(effectiveStats(stats,PETS[0],30),{knowledge:350,expression:37,dexterity:35,exploration:35,magic:350});
 assert.deepEqual(effectiveStats(stats,PETS[0],31),{knowledge:500,expression:53,dexterity:50,exploration:50,magic:500});
 assert.deepEqual(stats,before);assert.equal(difficultyForStat(stats.knowledge),4);
});

test('legacy exhausted saves remain readable while invalid new rest counters are rejected without writes',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');setSchedule(p,1,Array(5).fill('adventure'));
 delete r.forcedRestDays;r.exhausted=true;r.stamina=0;
 let raw=JSON.stringify(p),writes=0;const repo=createLocalRepository({getItem:()=>raw,setItem:()=>{writes++;}});
 const loaded=repo.load();assert.equal(writes,0);assert.equal(raw,JSON.stringify(p));
 for(let day=0;day<3;day++)applyAction(loaded,1,`1:1:${day}`);
 assert.equal(loaded.slots[0].activeRun.stamina,100);assert.equal(loaded.slots[0].activeRun.forcedRestDays,0);
 for(const value of [-1,4,1.5,'3']){const bad=structuredClone(p);bad.slots[0].activeRun.forcedRestDays=value;assert.throws(()=>validateProfile(bad));}
 const bad=structuredClone(p);bad.slots[0].activeRun.forcedRestDays=2;bad.slots[0].activeRun.exhausted=false;assert.throws(()=>validateProfile(bad));
});

test('52 mixed weeks preserve all actual activity records through weekly saves and stop at the ending boundary',()=>{
 let raw=null;const repo=createLocalRepository({getItem:()=>raw,setItem:(_,v)=>{raw=v;}}),writer=createBoundaryWriter(repo);
 let p=createProfile();startRun(p,1,'CH01');writer.save(p,1);
 for(let week=1;week<=52;week++){
  const r=p.slots[0].activeRun;setSchedule(p,1,['rune-circuit','adventure','rest','rune-link','rest']);
  applyAction(p,1,`1:${week}:0`,lessonResult(r));
  applyAction(p,1,`1:${week}:1`,{gameId:'adventure',outcome:'complete'});
  applyAction(p,1,`1:${week}:2`,undefined,()=>0);
  applyAction(p,1,`1:${week}:3`,lessonResult(r,'rune-link','library','knowledge'));
  applyAction(p,1,`1:${week}:4`,undefined,()=>0);
  finishWeek(p,1);acknowledgeWeekSummary(p,1);writer.save(p,1);p=repo.load();
 }
 const r=p.slots[0].activeRun;
 assert.equal(r.week,52);assert.equal(r.phase,'AWAITING_ENDING');assert.equal(r.actionHistory.length,260);
 assert.deepEqual(p.meta.counters,{minigames:104,classes:104,adventures:52});assert.equal(r.stamina,100);
 assert.equal(p.slots[0].status,'PLAYING');assert.throws(()=>finishWeek(p,1));
 assert.throws(()=>applyAction(p,1,'1:52:5'));assert.equal(r.actionHistory.length,260);
});

test('planning reserves compulsory rest dates and cannot replace them while later dates remain editable',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');r.stamina=9;
 const draft=scheduleDraft(r),m=calendarModel(r);
 assert.deepEqual(draft,['rest','rest','rest',null,null]);assert.equal(scheduleReady(draft),false);
 assert.equal(assignScheduleDay(r,draft,m.cells.find(c=>c.day===1&&!c.outsideMonth),'adventure'),false);
 for(const day of [4,5])assert.equal(assignScheduleDay(r,draft,m.cells.find(c=>c.day===day&&!c.outsideMonth),'adventure'),true);
 assert.equal(scheduleReady(draft),true);setSchedule(p,1,draft);applyAction(p,1,'1:1:0');
 const current=calendarModel(r);
 assert.equal(calendarActivity(r,current.cells.find(c=>c.day===2&&!c.outsideMonth),draft),'rest');
 assert.equal(calendarActivity(r,current.cells.find(c=>c.day===4&&!c.outsideMonth),draft),'adventure');
});

test('result feedback uses actual capped changes, and corrupt new activity effects cannot be saved',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');r.stamina=90;setSchedule(p,1,Array(5).fill('rest'));
 applyAction(p,1,'1:1:0',undefined,()=>0.999);
 assert.match(activityResultText(r.actionHistory[0]),/너무 잘 쉬었다/);
 assert.match(activityResultText(r.actionHistory[0]),/체력 \+10 \(100\/100\)/);
 assert.doesNotThrow(()=>validateProfile(p));
 for(const mutate of [e=>e.staminaAfter=101,e=>e.growth.magic=-1,e=>e.forcedRestDays=4,e=>e.restRecovery=99,e=>e.outcome='quit']){
  const bad=structuredClone(p);mutate(bad.slots[0].activeRun.actionHistory[0].effect);assert.throws(()=>validateProfile(bad));
 }
});
