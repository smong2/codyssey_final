import test from 'node:test';
import assert from 'node:assert/strict';
import * as collision from '../src/core/collision.mjs';
import {createProfile,startRun,setSchedule,finishWeek} from '../src/core/state.mjs';
import {runAction as applyAction} from './activity-helpers.mjs';
import {calendarModel} from '../src/core/preview.mjs';
import * as preview from '../src/core/preview.mjs';
import {validateProfile} from '../src/core/storage.mjs';
import {createAdventureResult,createAdventureStartData} from '../src/core/adventure-contract.mjs';
test('white-only foot samples normalize world coordinates and block invalid pixels',()=>{
 const pixels=new Uint8ClampedArray([255,255,255,255,0,0,0,255,128,128,128,255,255,255,255,0]);
 assert.equal(typeof collision.canWalk,'function');
 const mask={width:2,height:2,pixels,worldWidth:200,worldHeight:200};
 assert.equal(collision.canWalk(mask,50,50),true);
 for(const [x,y] of [[150,50],[50,150],[150,150],[-1,0],[200,0]])assert.equal(collision.canWalk(mask,x,y),false);
});
test('movement checks intermediate pixels so a large frame cannot cross a black wall',()=>{
 assert.equal(typeof collision.moveFoot,'function');
 const pixels=new Uint8ClampedArray(10*4).fill(255);pixels.set([0,0,0,255],5*4);
 const mask={width:10,height:1,pixels,worldWidth:10,worldHeight:1};
 assert.deepEqual(collision.moveFoot(mask,{x:2,y:0.5},7,0),{x:4.5,y:0.5});
});
test('adventure has no manual abort and completed walk advances once without rewards',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');
 assert.doesNotThrow(()=>setSchedule(p,1,['adventure','rest','rest','rest','rest']));
 assert.throws(()=>applyAction(p,1,'1:1:0',{gameId:'adventure',outcome:'quit'}));
 assert.equal(r.day,0);assert.equal(r.stamina,85);assert.equal(r.inProgressActivity.status,'IN_PROGRESS');
 assert.equal(applyAction(p,1,'1:1:0',{gameId:'adventure',outcome:'complete'}),true);
 assert.equal(r.day,1);assert.equal(r.stats.exploration,50);
 assert.equal(p.meta.counters.adventures,1);
 assert.equal(applyAction(p,1,'1:1:0',{gameId:'adventure',outcome:'complete'}),false);
});
test('mission success and timeout apply only the documented exploration growth and consume one day',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');setSchedule(p,1,['adventure','rest','rest','rest','rest']);
 const context=createAdventureStartData({missionId:'m1',locationId:'greenhouse',seed:'run-1-week-1-day-0',storedExploration:r.stats.exploration,objectiveCount:1});
 const success=createAdventureResult(context,'MISSION_COMPLETE',{foundCount:1,successGrowth:8});
 assert.equal(applyAction(p,1,'1:1:0',success),true);assert.equal(r.day,1);assert.equal(r.stats.exploration,58);
 const p2=createProfile(),r2=startRun(p2,1,'CH01');r2.stats.exploration=150;setSchedule(p2,1,['adventure','rest','rest','rest','rest']);
 const timeoutContext=createAdventureStartData({missionId:'m1',locationId:'greenhouse',seed:'run-1-week-1-day-0',storedExploration:r2.stats.exploration,objectiveCount:2});
 const timeout=createAdventureResult(timeoutContext,'TIMEOUT',{foundCount:1,successGrowth:8});
 assert.equal(applyAction(p2,1,'1:1:0',timeout),true);assert.equal(r2.day,1);assert.equal(r2.stats.exploration,152);
 const p3=createProfile();startRun(p3,1,'CH01');setSchedule(p3,1,['adventure','rest','rest','rest','rest']);
 assert.throws(()=>applyAction(p3,1,'1:1:0',{gameId:'adventure',outcome:'INTERRUPTED'}));
});
test('calendar retains actually played actions after a week ends',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');setSchedule(p,1,Array(5).fill('rest'));
 for(let day=0;day<5;day++)applyAction(p,1,`1:1:${day}`);
 finishWeek(p,1);
 assert.equal(calendarModel(r).cells.find(c=>c?.day===1).pastAction,'rest');
 assert.equal(calendarModel(r).cells.find(c=>c?.day===8).pastAction,null);
});
test('current-week calendar prioritizes forced rest over planned adventure',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');
 setSchedule(p,1,['adventure','rest','rest','rest','rest']);r.exhausted=true;r.stamina=0;
 applyAction(p,1,'1:1:0');const cell=calendarModel(r).cells.find(c=>c?.day===1);
 assert.equal(typeof preview.calendarActivity,'function');
 assert.equal(preview.calendarActivity(r,cell,[]),'rest');
});
test('legacy saves lack history safely, but corrupt new history is rejected',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');assert.doesNotThrow(()=>validateProfile(p));
 assert.equal(calendarModel(r).cells.find(c=>c?.day===1).pastAction,null);
 r.actionHistory={bad:true};assert.throws(()=>validateProfile(p));
});
