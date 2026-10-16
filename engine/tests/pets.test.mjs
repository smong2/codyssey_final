import test from 'node:test';
import assert from 'node:assert/strict';
import {PETS,activePet,effectiveStats,petCards} from '../src/core/pets.mjs';
import {createProfile,startRun,setSchedule} from '../src/core/state.mjs';
import {runAction as applyAction} from './activity-helpers.mjs';
import {createLocalRepository} from '../src/core/storage.mjs';
test('pet master preserves names, bonuses and legacy unlocks; invalid selection falls back without editing save',()=>{
 assert.equal(PETS.length,10);assert.equal(PETS[0].name,'에든');assert.equal(PETS[9].name,'세렌');
 for(const p of PETS)assert.deepEqual(Object.values(p.modifiers),p.id>='PET08'?[5,5]:[5,3]);
 const profile={meta:{pets:['pet2']},settings:{activePetId:'PET02'}};
 assert.equal(activePet(profile).name,'루엔');assert.equal(petCards(profile.meta)[1].unlocked,true);
 profile.settings.activePetId='PET10';assert.equal(activePet(profile).id,'PET01');assert.equal(profile.settings.activePetId,'PET10');
});
test('effective pet stats never change stored growth or stamina',()=>{
 const stats={knowledge:50,expression:50,dexterity:50,exploration:50,magic:50},before=structuredClone(stats);
 assert.deepEqual(effectiveStats(stats,PETS[0]),{...stats,knowledge:55,expression:53});assert.deepEqual(stats,before);
 const run=startRun(createProfile(),1,'CH01');effectiveStats(run.stats,PETS[0]);assert.equal(run.stamina,100);
});
test('pet setting persists across slots without capturing unsaved midweek run or changing recent save',()=>{
 let raw=null;const repository=createLocalRepository({getItem:()=>raw,setItem:(_,value)=>{raw=value;}}),profile=createProfile();
 startRun(profile,1,'CH01');startRun(profile,2,'CH08');profile.meta.pets=['pet2'];profile.meta.lastSavedSlotId=1;repository.save(profile);
 setSchedule(profile,1,Array(5).fill('rest'));applyAction(profile,1,'1:1:0');
 repository.saveSettings({activePetId:'PET02'});const saved=repository.load();
 assert.equal(activePet(saved).id,'PET02');assert.equal(saved.slots[0].activeRun.day,0);assert.equal(saved.slots[0].activeRun.phase,'PLANNING');assert.equal(saved.meta.lastSavedSlotId,1);
 assert.equal(saved.slots[1].activeRun.characterId,'CH08');assert.throws(()=>repository.saveSettings({activePetId:'PET10'}));assert.equal(activePet(repository.load()).id,'PET02');
});
test('settings write failure and corrupt save preserve previous selection and raw data',()=>{
 const profile=createProfile();profile.meta.pets=['pet2'];let raw=JSON.stringify(profile);
 const repository=createLocalRepository({getItem:()=>raw,setItem:()=>{throw new Error('quota');}});
 assert.throws(()=>repository.saveSettings({activePetId:'PET02'}),/quota/);assert.equal(JSON.parse(raw).settings.activePetId,'PET01');
 raw='corrupt';assert.throws(()=>repository.saveSettings({activePetId:'PET01'}));assert.equal(raw,'corrupt');
});
