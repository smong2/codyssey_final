import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,startRun,setSchedule} from '../src/core/state.mjs';
import {runAction as applyAction} from './activity-helpers.mjs';
import {createMinigameResult} from '../src/core/minigame-contract.mjs';
import {validateProfile} from '../src/core/storage.mjs';
test('new class registry accepts seven games and applies only their designated stat',()=>{
 const p=createProfile();startRun(p,1,'CH01');
 setSchedule(p,1,['rune-link','excavation','training-guardian','rune-merge','mirror-magic']);
 assert.equal(applyAction(p,1,'1:1:0',createMinigameResult({gameId:'rune-link',locationId:'library',difficulty:1,seed:'test'},'success',0,0)),true);
 assert.equal(p.slots[0].activeRun.stats.knowledge,55);
 assert.equal(p.slots[0].activeRun.stats.magic,50);
 assert.throws(()=>applyAction(p,1,'1:1:1',createMinigameResult({gameId:'rune-link',locationId:'library',difficulty:1,seed:'test'},'success',0,0)));
 assert.equal(p.slots[0].activeRun.day,1);validateProfile(p);
});
test('seal and explicit rune schedules resolve forfeits as failures',()=>{
 const p=createProfile();startRun(p,1,'CH01');
 setSchedule(p,1,['seal-dismantle','rune-circuit','rest','rest','class']);
 assert.equal(applyAction(p,1,'1:1:0',createMinigameResult({gameId:'seal-dismantle',locationId:'plaza',difficulty:1,seed:'test'},'quit',0,0)),true);
 assert.equal(p.slots[0].activeRun.day,1);assert.equal(p.slots[0].activeRun.actionHistory[0].effect.outcome,'failure');validateProfile(p);
});
test('calendar uses Sunday first and day365 with the approved temporary Arcadia era',async()=>{
 const {calendarModel,titleModel}=await import('../src/core/preview.mjs');
 const p=createProfile();assert.deepEqual(titleModel(p),{startLabel:'시작하기',continueVisible:false});
 startRun(p,1,'CH01');assert.equal(titleModel(p).continueVisible,true);
 const m=calendarModel(p.slots[0].activeRun);assert.equal(m.month,1);assert.equal(m.day,1);assert.equal(m.weekday,1);assert.equal(m.cells[0].month,12);assert.equal(m.cells[0].day,31);assert.equal(m.cells[0].inWeek,false);assert.equal(m.cells[1].day,1);assert.equal(m.cells.length,42);assert.equal(m.cells[31].day,31);assert.equal(m.cells[41].month,2);assert.equal(m.cells[41].day,10);assert.equal(m.arcadiaYear,327);
 assert.equal(m.cells[1].actionIndex,0);assert.equal(m.cells[7].weekend,true);assert.equal(m.cells[7].actionIndex,null);
 const ending=calendarModel({week:52,day:5,phase:'AWAITING_ENDING'});assert.equal(ending.month,12);assert.equal(ending.day,31);assert.equal(ending.weekday,1);assert.equal(ending.arcadiaYear,327);
 for(const s of p.slots)s.status='RUN_COMPLETE';assert.deepEqual(titleModel(p),{startLabel:'새로 시작하기',continueVisible:true});
});
test('non-leap calendar matches story weeks without changing run progress or history',async()=>{
 const {calendarModel}=await import('../src/core/preview.mjs');
 for(const [week,month,day] of [[1,1,1],[10,3,5],[23,6,4],[36,9,3],[49,12,3],[52,12,24]]){
  const run={week,day:0,phase:'PLANNING',schedule:[],actionHistory:[{week:1,day:0,action:'rest'}]},before=structuredClone(run),m=calendarModel(run);
  assert.equal(m.month,month);assert.equal(m.day,day);assert.equal(m.weekday,1);assert.equal(m.arcadiaYear,327);assert.deepEqual(run,before);
 }
 const february=calendarModel({week:1,day:0,phase:'PLANNING'},1);
 assert.equal(february.cells.filter(c=>!c.outsideMonth).length,28);
 const december=calendarModel({week:52,day:5,phase:'WEEK_COMPLETE'});
 assert.equal(december.month,12);assert.equal(december.day,29);
 assert.equal(december.cells.find(c=>c.month===12&&c.day===30).weekday,0);
 assert.equal(december.cells.find(c=>c.month===12&&c.day===30).inWeek,true);
});
test('schedule draft starts empty and only assigns valid activities to current action days',async()=>{
 const core=await import('../src/core/preview.mjs');assert.equal(typeof core.assignScheduleDay,'function');
 const p=createProfile();startRun(p,1,'CH01');const run=p.slots[0].activeRun,draft=core.scheduleDraft(run),m=core.calendarModel(run);
 assert.deepEqual(draft,[null,null,null,null,null]);assert.equal(core.scheduleReady(draft),false);
 assert.equal(core.assignScheduleDay(run,draft,m.cells[1],'rest'),true);assert.equal(draft[0],'rest');assert.deepEqual(run.schedule,[]);
 assert.equal(core.assignScheduleDay(run,draft,m.cells[7],'rest'),false);assert.equal(core.assignScheduleDay(run,draft,m.cells[8],'rest'),false);assert.equal(core.assignScheduleDay(run,draft,m.cells[2],'unknown'),false);
 for(let i=2;i<=5;i++)core.assignScheduleDay(run,draft,m.cells[i],'rune-link');assert.equal(core.scheduleReady(draft),true);
 run.phase='ACTING';assert.equal(core.assignScheduleDay(run,draft,m.cells[1],'rune-circuit'),false);assert.equal(draft[0],'rest');
 });
test('schedule session preserves navigation draft but resets for a replacement run in the same slot',async()=>{
 const {scheduleSession}=await import('../src/core/preview.mjs');assert.equal(typeof scheduleSession,'function');
 const p=createProfile();startRun(p,1,'CH01');const r=p.slots[0].activeRun,first=scheduleSession(null,r);first.draft.fill('rest');
 assert.equal(scheduleSession(first,r),first);const replacement={...r,schedule:[]};const next=scheduleSession(first,replacement);assert.notEqual(next,first);assert.deepEqual(next.draft,[null,null,null,null,null]);
 r.week++;assert.deepEqual(scheduleSession(first,r).draft,[null,null,null,null,null]);
});
test('approved preview assets are served with correct types without exposing repository',async t=>{
 const {createEngineServer}=await import('../server.mjs');const s=createEngineServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>s.close(r)));
 const base='http://127.0.0.1:'+s.address().port;
 for(const [path,type] of [['/design-assets/pet/PT01_owl.png','image/png'],['/design-assets/font_files/gowun_batang.woff2','font/woff2'],['/design-assets/map/map1_straight.png','image/png'],['/design-assets/ui/player_status_frame_015.png','image/png'],['/design-assets/ui/UI10_dialogue_panel_plain.png','image/png'],...['BT01_diary_green.png','BT02_backpack_green.png','BT03_menu_green.png','BT04_blank_green.png','BT04_blank_pale_green.png','BT05_start_game.png','BT06_new_game.png','BT07_continue_game.png'].map(file=>['/design-assets/ui/'+file,'image/png']),['/intro.mp4','video/mp4']]){
 const r=await fetch(base+path,{method:'HEAD'});assert.equal(r.status,200,path);assert.equal(r.headers.get('content-type'),type);
 }
 assert.notEqual((await fetch(base+'/design-assets/font_files/README.md')).status,200);
 const r=await fetch(base+'/intro.mp4',{headers:{Range:'bytes=0-15'}});assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,16);
});
