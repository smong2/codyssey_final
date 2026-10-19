import test from 'node:test';
import assert from 'node:assert/strict';
import * as collision from '../src/core/collision.mjs';
import {createProfile,startRun,setSchedule,beginAction,finishWeek} from '../src/core/state.mjs';
import {runAction as applyAction} from './activity-helpers.mjs';
import {calendarModel} from '../src/core/preview.mjs';
import * as preview from '../src/core/preview.mjs';
import {validateProfile} from '../src/core/storage.mjs';
import {createAdventureResult,createAdventureStartData} from '../src/core/adventure-contract.mjs';
import {ADVENTURE_LOCATIONS,createPreviewObjectives,reachableSafeCandidates,investigateObjective,clueForPoint} from '../src/core/adventure-mission.mjs';
import * as missions from '../src/core/adventure-mission.mjs';
test('clock clues use all 24 half-hour directions around the supplied map center',()=>{
 const origin={x:500,y:500},labels=new Set();
 for(let index=0;index<24;index++){
  const angle=index*Math.PI/12-Math.PI/2,target={x:500+300*Math.cos(angle),y:500+300*Math.sin(angle)};
  const hour=Math.floor(index/2)||12,expected=`맵 중심에서 ${hour}시${index%2?' 30분':''} 방향`;
  assert.equal(clueForPoint(origin,target),expected);labels.add(expected);
 }
 assert.equal(labels.size,24);
});
test('adventure samples the official five-item pool and disperses safe targets around the map center',()=>{
 const width=64,pixels=new Uint8ClampedArray(width*width*4);pixels.fill(255);
 const mask={width,height:width,pixels,worldWidth:3200,worldHeight:3200},spawn={x:1600,y:3000},seen=new Set();
 for(const locationId of ['greenhouse','library','observatory']){
  const prefix={greenhouse:'ADV_GH_',library:'ADV_LIB_',observatory:'ADV_OBS_'}[locationId];
  for(let seed=0;seed<20;seed++){
   const targets=createPreviewObjectives({mask,spawn,count:3,seed,locationId,placement:{gridStep:3}});
   assert.equal(new Set(targets.map(t=>t.id)).size,3);assert.equal(new Set(targets.map(t=>t.clue)).size,3);
   for(const target of targets){assert.ok(target.id.startsWith(prefix));assert.equal(target.imageSrc,'./design-assets/item/adventure/'+target.id+'.png');assert.equal(target.clue,clueForPoint({x:1600,y:1600},target));assert.notEqual(target.clue,'맵 중심에서 6시 방향');assert.ok(Math.hypot(target.x-1600,target.y-1600)>88);seen.add(target.id);}
  }
 }
 assert.equal(seen.size,15);
});
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
test('three planned adventure locations select their distinct replaceable preview maps',()=>{
 assert.deepEqual(ADVENTURE_LOCATIONS.map(x=>x.id),['greenhouse','library','observatory']);
 assert.deepEqual(ADVENTURE_LOCATIONS.map(x=>x.mapId),['greenhouse','library','observatory']);
 assert.ok(ADVENTURE_LOCATIONS.every(x=>x.previewOnly));
});
test('every selected place resolves its registered layers and unknown map ids fail explicitly',()=>{
 assert.equal(typeof missions.getAdventureMap,'function');
 for(const [id,world,mask,foreground]of [
  ['greenhouse','MP01_greenhouse_world_3840x2160.webp','MP01_greenhouse_collision_mask_3840x2160.png','MP01_greenhouse_foreground_3840x2160.webp'],
  ['library','MP02_grand_library_world_3840x2160.webp','MP02_grand_library_collision_mask_3840x2160.png','MP02_grand_library_foreground_3840x2160.webp'],
  ['observatory','MP03_starlight_observatory_world_3840x2160.webp','MP03_starlight_observatory_collision_mask_3840x2160.png','MP03_starlight_observatory_foreground_3840x2160.webp']
 ]){
  const map=missions.getAdventureMap(id);
  assert.equal(map.world,'./design-assets/map/'+world);
  assert.equal(map.thumbnail,'./design-assets/map/'+world.replace('3840x2160','1920x1080'));
  assert.equal(map.mask,'./design-assets/map/'+mask);
  assert.equal(map.foreground,'./design-assets/map/'+foreground);
 }
 assert.throws(()=>missions.getAdventureMap('missing'));
});
test('placement respects world-sized wall clearance, no-go rectangles and nonoverlapping search ranges',()=>{
 const pixels=new Uint8ClampedArray(120*80*4);
 for(let y=2;y<78;y++)for(let x=2;x<118;x++)pixels.set([255,255,255,255],(y*120+x)*4);
 const mask={width:120,height:80,pixels,worldWidth:1200,worldHeight:800};
 const candidates=reachableSafeCandidates(mask,{x:600,y:400},{gridStep:1,wallClearance:30,spawnRadius:100,spacing:100,investigationRadius:60,forbiddenZones:[{x:300,y:200,width:300,height:300}]});
 assert.ok(candidates.length>0);
 for(const point of candidates){
  assert.ok(point.x>=50&&point.x<=1150&&point.y>=50&&point.y<=750);
  assert.ok(!(point.x>=270&&point.x<=630&&point.y>=170&&point.y<=530));
  assert.ok(Math.hypot(point.x-600,point.y-400)>=100);
 }
 for(let i=0;i<candidates.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(candidates[i].x-candidates[j].x,candidates[i].y-candidates[j].y)>=120);
});
test('placement excludes a room reachable only through a passage narrower than the foot clearance',()=>{
 const pixels=new Uint8ClampedArray(100*50*4),white=(x,y)=>pixels.set([255,255,255,255],(y*100+x)*4);
 for(let y=2;y<48;y++){for(let x=2;x<45;x++)white(x,y);for(let x=55;x<98;x++)white(x,y);}
 for(let x=45;x<55;x++)white(x,25);
 const points=reachableSafeCandidates({width:100,height:50,pixels,worldWidth:1000,worldHeight:500},{x:200,y:250},{gridStep:2,wallClearance:20,spawnRadius:0,spacing:50,investigationRadius:20});
 assert.ok(points.length>0);assert.ok(points.every(p=>p.x<450));
});
test('weekly schedule persists the selected adventure place per day and carries it into its checkpoint',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');
 setSchedule(p,1,['adventure','rest','adventure','rest','rest'],['library',null,'observatory',null,null]);
 assert.deepEqual(r.scheduleLocations,['library',null,'observatory',null,null]);
 assert.doesNotThrow(()=>validateProfile(p));
 const checkpoint=beginAction(p,1,'1:1:0');
 assert.equal(checkpoint.locationId,'library');
 assert.doesNotThrow(()=>validateProfile(p));
});
test('unknown adventure locations are rejected without mutating the weekly plan',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');
 assert.throws(()=>setSchedule(p,1,['adventure','rest','rest','rest','rest'],['unknown',null,null,null,null]));
 assert.equal(r.phase,'PLANNING');assert.deepEqual(r.schedule,[]);
});
test('preview objectives are deterministic, uniquely placed in reachable safe mask cells, and have qualitative clues',()=>{
 const pixels=new Uint8ClampedArray(60*60*4);
 for(let y=6;y<54;y++)for(let x=6;x<54;x++)pixels.set([255,255,255,255],(y*60+x)*4);
 const mask={width:60,height:60,pixels,worldWidth:3000,worldHeight:3000};
 const candidates=reachableSafeCandidates(mask,{x:1500,y:1500},{gridStep:3,wallClearance:24,spawnRadius:30,spacing:30});
 assert.ok(candidates.length>0);
 const first=createPreviewObjectives({mask,spawn:{x:1500,y:1500},count:3,seed:'preview-seed'});
 const again=createPreviewObjectives({mask,spawn:{x:1500,y:1500},count:3,seed:'preview-seed'});
 assert.deepEqual(first,again);assert.equal(first.length,3);
 assert.ok(first.every(o=>candidates.some(p=>p.x===o.x&&p.y===o.y)));
 assert.ok(first.every(o=>o.name&&o.clue&&clueForPoint({x:1500,y:1500},o).includes('방향')));
});
test('investigation discovers only when close and otherwise gives qualitative direction and range',()=>{
 const objective={id:'one',x:120,y:100};
 assert.deepEqual(investigateObjective({x:100,y:100},[objective],[],30),{foundId:'one',hint:null});
 const miss=investigateObjective({x:20,y:100},[objective],[],30);
 assert.equal(miss.foundId,null);assert.match(miss.hint,/쪽|거리/);
 assert.deepEqual(investigateObjective({x:120,y:100},[objective],['one'],30),{foundId:null,hint:null});
});
test('adventure rejects uncontracted quit results and completed walk advances once without rewards',()=>{
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
test('adventure result must match the selected place and successful history preserves that place',()=>{
 const p=createProfile(),r=startRun(p,1,'CH01');setSchedule(p,1,['adventure','rest','rest','rest','rest'],['observatory',null,null,null,null]);
 const checkpoint=beginAction(p,1,'1:1:0');
 const wrong=createAdventureStartData({missionId:'wrong-place',locationId:'greenhouse',seed:'run-1-week-1-day-0',storedExploration:r.stats.exploration,objectiveCount:1});
 assert.throws(()=>applyAction(p,1,'1:1:0',createAdventureResult(wrong,'MISSION_COMPLETE',{foundCount:1,successGrowth:8})));
 const correct=createAdventureStartData({missionId:'right-place',locationId:checkpoint.locationId,seed:'run-1-week-1-day-0',storedExploration:r.stats.exploration,objectiveCount:1});
 assert.equal(applyAction(p,1,'1:1:0',createAdventureResult(correct,'MISSION_COMPLETE',{foundCount:1,successGrowth:8})),true);
 assert.equal(r.actionHistory[0].locationId,'observatory');assert.doesNotThrow(()=>validateProfile(p));
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
