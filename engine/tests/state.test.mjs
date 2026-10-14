import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, startRun, setSchedule, applyAction, finishWeek, deleteSlot } from '../src/core/state.mjs';

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
  const r = { gameId:'rune-circuit', outcome:'success', score:900 };
  assert.equal(applyAction(p,1,'1:1:0',r), true);
  assert.equal(applyAction(p,1,'1:1:0',r), false);
  assert.equal(p.slots[0].activeRun.stats.magic, 53);
  assert.equal(p.meta.counters.minigames, 1);
  assert.throws(() => finishWeek(p,1));
  for(let d=1;d<5;d++) applyAction(p,1,`1:1:${d}`);
  finishWeek(p,1);
  assert.equal(p.slots[0].activeRun.week, 2);
  assert.equal(p.slots[0].activeRun.day, 0);
  assert.equal(p.slots[0].activeRun.stamina, 100);
  assert.throws(() => finishWeek(p,1));
});
test('quit does not consume a day and failures never deduct growth stats', () => {
  const p=createProfile(); startRun(p,1,'CH01');
  setSchedule(p,1,['class','rest','rest','rest','rest']);
  assert.equal(applyAction(p,1,'1:1:0',{gameId:'rune-circuit',outcome:'quit'}),false);
  assert.equal(p.slots[0].activeRun.day,0);
  applyAction(p,1,'1:1:0',{gameId:'rune-circuit',outcome:'failure'});
  assert.equal(p.slots[0].activeRun.stats.magic,50);
  assert.equal(p.slots[0].activeRun.day,1);
});
test('overwork requires recovery to 70 and week 52 awaits a real ending', () => {
  const p=createProfile(); startRun(p,1,'CH01');
  const run=p.slots[0].activeRun; run.stamina=5;
  setSchedule(p,1,['class','class','rest','rest','rest']);
  applyAction(p,1,'1:1:0',{gameId:'rune-circuit',outcome:'success'});
  assert.equal(run.exhausted,true);
  applyAction(p,1,'1:1:1');
  assert.equal(run.stamina,25);
  applyAction(p,1,'1:1:2'); applyAction(p,1,'1:1:3');
  assert.equal(run.exhausted,false);
  applyAction(p,1,'1:1:4'); run.week=52; finishWeek(p,1);
  assert.equal(run.phase,'AWAITING_ENDING');
  assert.equal(run.week,52);
  assert.equal(p.slots[0].status,'PLAYING');
});
