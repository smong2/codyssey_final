import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, startRun, setSchedule, finishWeek, deleteSlot } from '../src/core/state.mjs';
import {runAction as applyAction} from './activity-helpers.mjs';
import {createMinigameResult} from '../src/core/minigame-contract.mjs';

const gameResult=(gameId,outcome,difficulty=1)=>createMinigameResult({gameId,locationId:'workshop',difficulty,seed:'state-test'},outcome,900,10);

test('new slots share meta while runs keep independent progress', () => {
  const p = createProfile();
  startRun(p, 1, 'CH01'); startRun(p, 2, 'CH08');
  p.meta.badges.push('first'); deleteSlot(p, 1);
  assert.equal(p.slots.length, 5);
  assert.equal(p.slots[0].status, 'EMPTY');
  assert.deepEqual(p.meta.badges, ['first']);
  assert.equal(p.slots[1].activeRun.characterId, 'CH08');
  assert.equal(p.slots[1].activeRun.stats.magic, 50);
  assert.throws(() => startRun(p, 2, 'CH01'));
  assert.throws(() => startRun(p, 3, 'CH03'));
});
test('five weekday results advance once and weekend is processed once', () => {
  const p = createProfile(); startRun(p, 1, 'CH01');
  setSchedule(p, 1, ['class','rest','rest','rest','rest']);
  const r = gameResult('rune-circuit','success');
  assert.equal(applyAction(p,1,'1:1:0',r), true);
  assert.equal(applyAction(p,1,'1:1:0',r), false);
  assert.equal(p.slots[0].activeRun.stats.magic, 55);
  assert.equal(p.meta.counters.minigames, 1);
  assert.throws(() => finishWeek(p,1));
  for(let d=1;d<5;d++) applyAction(p,1,`1:1:${d}`);
  finishWeek(p,1);
  assert.equal(p.slots[0].activeRun.week, 2);
  assert.equal(p.slots[0].activeRun.day, 0);
  assert.equal(p.slots[0].activeRun.stamina, 100);
  assert.throws(() => finishWeek(p,1));
});
test('forfeiting a class resolves as failure and consumes its day', () => {
  const p=createProfile(); startRun(p,1,'CH01');
  setSchedule(p,1,['class','rest','rest','rest','rest']);
  assert.equal(applyAction(p,1,'1:1:0',gameResult('rune-circuit','quit')),true);
  assert.equal(p.slots[0].activeRun.day,1);
  assert.equal(p.slots[0].activeRun.stats.magic,50);
  assert.equal(p.slots[0].activeRun.actionHistory[0].effect.outcome,'failure');
});
test('success, failure, great success and timeout use difficulty growth while class quit resolves as failure',()=>{
  const p=createProfile();startRun(p,1,'CH01');const run=p.slots[0].activeRun;
  run.stats.knowledge=201;run.stats.exploration=351;
  setSchedule(p,1,['rune-link','seal-dismantle','rune-link','rune-link','rest']);
  applyAction(p,1,'1:1:0',createMinigameResult({gameId:'rune-link',locationId:'library',difficulty:3,seed:'success'},'success',120,300));
  assert.equal(run.stats.knowledge,208);assert.equal(run.day,1);assert.equal(run.stamina,90);
  run.stamina=30;
  applyAction(p,1,'1:1:1',createMinigameResult({gameId:'seal-dismantle',locationId:'plaza',difficulty:4,seed:'great'},'greatSuccess',0,100));
  assert.equal(run.stats.exploration,356);assert.equal(run.day,2);assert.equal(run.stamina,20);
  applyAction(p,1,'1:1:2',createMinigameResult({gameId:'rune-link',locationId:'library',difficulty:3,seed:'failure'},'failure',0,100));
  assert.equal(run.stats.knowledge,209);assert.equal(run.day,3);
  assert.throws(()=>applyAction(p,1,'1:1:3',createMinigameResult({gameId:'rune-link',locationId:'library',difficulty:2,seed:'wrong-difficulty'},'success',0,100)));
  applyAction(p,1,'1:1:3',createMinigameResult({gameId:'rune-link',locationId:'library',difficulty:3,seed:'timeout'},'timeout',0,180000));
  assert.equal(run.stats.knowledge,209);assert.equal(run.day,4);
});
test('low stamina halves the approved growth and stats remain capped at 500',()=>{
  const p=createProfile();startRun(p,1,'CH01');const run=p.slots[0].activeRun;
  run.stats.magic=495;run.stamina=30;setSchedule(p,1,['rune-circuit','rest','rest','rest','rest']);
  applyAction(p,1,'1:1:0',gameResult('rune-circuit','greatSuccess',4));
  assert.equal(run.stats.magic,500);assert.equal(run.stamina,20);
});
test('three forced rest weekdays recover stamina and week 52 awaits a real ending', () => {
  const p=createProfile(); startRun(p,1,'CH01');
  const run=p.slots[0].activeRun; run.stamina=5;
  setSchedule(p,1,['class','class','rest','rest','rest']);
  applyAction(p,1,'1:1:0');
  assert.equal(run.exhausted,true);
  applyAction(p,1,'1:1:1');
  assert.equal(run.stamina,5);
  applyAction(p,1,'1:1:2');assert.equal(run.stamina,100);applyAction(p,1,'1:1:3');
  assert.equal(run.exhausted,false);
  applyAction(p,1,'1:1:4'); run.week=52; finishWeek(p,1);
  assert.equal(run.phase,'AWAITING_ENDING');
  assert.equal(run.week,52);
  assert.equal(p.slots[0].status,'PLAYING');
});
