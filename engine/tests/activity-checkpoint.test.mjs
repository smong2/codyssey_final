import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,startRun,setSchedule,beginAction,applyAction,recoverInterruptedAction,stopAdventure} from '../src/core/state.mjs';
import {createMinigameResult} from '../src/core/minigame-contract.mjs';
import {createLocalRepository,validateProfile} from '../src/core/storage.mjs';
import {activityResultText} from '../src/core/activity-rules.mjs';

const result=(outcome='success')=>createMinigameResult({gameId:'rune-circuit',locationId:'workshop',difficulty:1,seed:'checkpoint'},outcome,5,100);

test('activity start checkpoints its status and stamina before content runs',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');
 setSchedule(profile,1,['rune-circuit','adventure','rest','rest','rest']);
 const started=beginAction(profile,1,'1:1:0');
 assert.equal(started.action,'rune-circuit');
 assert.equal(run.inProgressActivity.status,'IN_PROGRESS');
 assert.equal(run.stamina,90);
 assert.equal(run.day,0);
 assert.equal(run.stats.magic,50);
 assert.doesNotThrow(()=>validateProfile(profile));
});

test('activity result completes the checkpoint without charging stamina twice',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');
 setSchedule(profile,1,['rune-circuit','adventure','rest','rest','rest']);
 beginAction(profile,1,'1:1:0');
 assert.equal(applyAction(profile,1,'1:1:0',result()),true);
 assert.equal(run.stamina,90);
 assert.equal(run.day,1);
 assert.equal(run.inProgressActivity,undefined);
 assert.equal(run.actionHistory[0].status,'COMPLETED');
 assert.equal(applyAction(profile,1,'1:1:0',result()),false);
});

test('reloading an in-progress activity resolves it once as interrupted without growth',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');
 setSchedule(profile,1,['rune-circuit','adventure','rest','rest','rest']);
 beginAction(profile,1,'1:1:0');
 const repository=createLocalRepository({getItem:()=>JSON.stringify(profile),setItem(){}});
 const loaded=repository.load(),recovered=loaded.slots[0].activeRun;
 assert.equal(recoverInterruptedAction(loaded,1),true);
 assert.equal(recovered.day,1);
 assert.equal(recovered.stamina,90);
 assert.equal(recovered.stats.magic,50);
 assert.equal(recovered.actionHistory[0].status,'INTERRUPTED');
 assert.equal(recovered.actionHistory[0].effect.outcome,'interrupted');
 assert.match(activityResultText(recovered.actionHistory[0]),/중단/);
 assert.equal(recoverInterruptedAction(loaded,1),false);
 assert.doesNotThrow(()=>validateProfile(loaded));
});

test('manual adventure stop is a completed failure that preserves spent stamina and grants no growth',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');
 setSchedule(profile,1,['adventure','rest','rest','rest','rest']);
 const checkpoint=beginAction(profile,1,'1:1:0'),growthBefore=structuredClone(run.stats);
 assert.throws(()=>stopAdventure(profile,1,'wrong-token'));
 assert.equal(run.day,0);assert.equal(run.stamina,85);
 assert.equal(stopAdventure(profile,1,checkpoint.token),true);
 assert.equal(run.day,1);
 assert.equal(run.stamina,85);
 assert.deepEqual(run.stats,growthBefore);
 assert.equal(run.actionHistory[0].status,'COMPLETED');
 assert.equal(run.actionHistory[0].effect.outcome,'failure');
 assert.equal(profile.meta.counters.adventures,1);
 assert.match(activityResultText(run.actionHistory[0]),/실패/);
 assert.equal(stopAdventure(profile,1,checkpoint.token),false);
 assert.doesNotThrow(()=>validateProfile(profile));
});

test('saved checkpoint must match the active schedule and its documented stamina cost',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');
 setSchedule(profile,1,['rune-circuit','adventure','rest','rest','rest']);beginAction(profile,1,'1:1:0');
 const wrongAction=structuredClone(profile);wrongAction.slots[0].activeRun.inProgressActivity.action='adventure';
 assert.throws(()=>validateProfile(wrongAction));
 const wrongCost=structuredClone(profile);wrongCost.slots[0].activeRun.inProgressActivity.staminaCost=0;
 assert.throws(()=>validateProfile(wrongCost));
 assert.equal(run.day,0);
});

test('rest checkpoint has no effect until the selected rest result is completed',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');
 run.stamina=20;setSchedule(profile,1,['rest','rest','rest','rest','rest']);
 beginAction(profile,1,'1:1:0');
 assert.equal(run.stamina,20);
 assert.equal(applyAction(profile,1,'1:1:0',undefined,()=>0),true);
 assert.equal(run.stamina,60);
 assert.equal(run.actionHistory[0].status,'COMPLETED');
});

test('interrupted rest is clearly labeled without inventing a recovery result',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');
 run.stamina=20;setSchedule(profile,1,Array(5).fill('rest'));beginAction(profile,1,'1:1:0');
 recoverInterruptedAction(profile,1);
 assert.match(activityResultText(run.actionHistory[0]),/중단/);
 assert.equal(run.actionHistory[0].effect.restRecovery,undefined);
 assert.equal(run.stamina,20);
});
