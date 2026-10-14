import test from 'node:test';
import assert from 'node:assert/strict';
import * as ui from '../src/core/ui-flow.mjs';
import {createProfile,startRun} from '../src/core/state.mjs';
import {createBoundaryWriter} from '../src/core/storage.mjs';
test('new game selects first empty slot and never overwrites a full profile',()=>{
 assert.equal(typeof ui.firstEmptySlot,'function');const p=createProfile();
 startRun(p,1,'CH01');startRun(p,2,'CH02');assert.equal(ui.firstEmptySlot(p).slotId,3);
 for(const s of p.slots)s.status='PLAYING';assert.equal(ui.firstEmptySlot(p),null);
});
test('recent save is published only after successful storage and retry keeps original boundary',()=>{
 assert.equal(typeof ui.recentSlot,'function');
 const p=createProfile();startRun(p,1,'CH01');startRun(p,2,'CH02');
 let failing=true,snapshot;
 const writer=createBoundaryWriter({save(value){if(failing)throw Error('disk full');snapshot=structuredClone(value);}});
 assert.throws(()=>writer.save(p,2));assert.equal(ui.recentSlot(p),null);
 p.slots[1].activeRun.week=2;failing=false;writer.retry();
 assert.equal(snapshot.slots[1].activeRun.week,1);
 assert.equal(ui.recentSlot(p).slotId,2);assert.ok(snapshot.slots[1].lastSavedAt);
 writer.save(p,1);assert.equal(ui.recentSlot(p).slotId,1);
});
test('notification replacement cancels the old dismissal and clears new text later',()=>{
 assert.equal(typeof ui.createNotifier,'function');const jobs=new Map();let n=0;
 const target={textContent:''},notify=ui.createNotifier(target,(f,ms)=>{jobs.set(++n,{f,ms});return n;},id=>jobs.delete(id));
 notify('first');notify('second');assert.equal(jobs.size,1);assert.equal(target.textContent,'second');
 const job=[...jobs.values()][0];assert.equal(job.ms,3000);job.f();assert.equal(target.textContent,'');
});
test('admission substitutes the selected name without creating missing dialogue',()=>{
 assert.equal(typeof ui.invitationLines,'function');
 assert.equal(ui.invitationLines('세라')[0],'세라에게');
 assert.ok(ui.ADMISSION_SCENES.length>=3);
 assert.equal(ui.ADMISSION_SCENES.every(s=>s.dialogue===null),true);
});
test('cancelled page flip cannot change a reopened diary or keep its input locked',()=>{
 assert.equal(typeof ui.createPageTurnGate,'function');const gate=ui.createPageTurnGate();let shown='original';
 const cancelled=gate.begin(()=>shown='stale');assert.equal(gate.begin(()=>{}),null);
 gate.reset();const current=gate.begin(()=>shown='new');cancelled();assert.equal(shown,'original');
 assert.equal(gate.begin(()=>{}),null);current();assert.equal(shown,'new');
 assert.equal(typeof gate.begin(()=>{}),'function');
});
