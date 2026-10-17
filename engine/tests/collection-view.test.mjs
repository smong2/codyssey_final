import test from 'node:test';
import assert from 'node:assert/strict';
import {BADGE_GROUPS,badgeProgress,ROOM_BACKGROUNDS,roomProgress,activeRoom} from '../src/core/collection-view.mjs';
import {createProfile,startRun} from '../src/core/state.mjs';
import {studentCards} from '../src/core/catalogue.mjs';
import {createLocalRepository} from '../src/core/storage.mjs';
test('badge frames expose 200 conditions but never infer awards from counters or hidden stats',()=>{
 assert.equal(BADGE_GROUPS.length,5);assert.equal(BADGE_GROUPS.flatMap(g=>g.subgroups).reduce((sum,s)=>sum+s.thresholds.length,0),200);
 const meta={badges:[],counters:{adventures:200},hiddenStats:{curiosity:100}},group=BADGE_GROUPS[0],sub=group.subgroups[0];
 const result=badgeProgress(meta,group,sub);assert.equal(result.current,200);assert.deepEqual(result.earned,[]);
 assert.equal(badgeProgress(meta,group,group.subgroups[3]).current,null);
});
test('room progress keeps missing art unassigned and background selection saves settings without capturing the active run',()=>{
 assert.equal(ROOM_BACKGROUNDS.length,4);const p=createProfile();startRun(p,1,'CH01');
 assert.equal(roomProgress(p.meta,'room-1').unlocked,false);assert.equal(roomProgress(p.meta,'room-1').images,null);
 p.meta.collectionView={rooms:[{id:'room-1',pieces:[0,3,4],unlocked:true,images:{day:'BG03_myroom1_day_1920x1080_012.png'}}]};
 let raw;const repository=createLocalRepository({getItem:()=>raw,setItem:(_key,value)=>raw=value});repository.save(p);p.slots[0].activeRun.stats.magic=300;
 repository.saveSettings({activeRoomBackgroundId:'room-1'});const restored=repository.load();assert.equal(restored.slots[0].activeRun.stats.magic,50);assert.equal(activeRoom(restored).image,'BG03_myroom1_day_1920x1080_012.png');assert.equal(activeRoom(restored,'night').image,'BG03_myroom1_day_1920x1080_012.png');assert.throws(()=>repository.saveSettings({activeRoomBackgroundId:'room-2'}));
});
test('a received character unlock enables the next run and applies only its initial modifiers plus permanent bonuses',()=>{
 const p=createProfile();assert.equal(p.meta.unlockedCharacters.length,6);assert.throws(()=>startRun(p,1,'CH03'));
 p.meta.unlockedCharacters.push('CH03');p.meta.permanentBonuses={knowledge:3};assert.equal(studentCards(p.meta).find(c=>c.id==='CH03').selectable,true);
 const r=startRun(p,1,'CH03');assert.deepEqual(r.stats,{knowledge:53,expression:40,dexterity:50,exploration:50,magic:60});
 assert.equal(Object.keys(r.hiddenStats).length,8);assert.ok(Object.values(r.hiddenStats).every(value=>value===0));
 p.meta.permanentBonuses.magic=15;assert.equal(r.stats.magic,60);
 let raw;const repository=createLocalRepository({getItem:()=>raw,setItem:(_key,value)=>raw=value});repository.save(p);assert.equal(repository.load().slots[0].activeRun.characterId,'CH03');
});
