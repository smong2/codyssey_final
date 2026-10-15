import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,startRun} from '../src/core/state.mjs';
import {createLocalRepository} from '../src/core/storage.mjs';
test('save and resume preserves meta and run independently of memory',()=>{
 const data=new Map();const repo=createLocalRepository({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)});
 const p=repo.load();startRun(p,1,'CH01');p.meta.badges.push('badge-1');repo.save(p);
 const loaded=repo.load();assert.equal(loaded.slots[0].activeRun.characterId,'CH01');assert.deepEqual(loaded.meta.badges,['badge-1']);
 loaded.meta.badges.push('unsaved');assert.deepEqual(repo.load().meta.badges,['badge-1']);
});
test('corrupt or future saves are never silently overwritten',()=>{
 let raw='{"version":99}';let writes=0;const repo=createLocalRepository({getItem:()=>raw,setItem:()=>writes++});
 assert.throws(()=>repo.load());assert.equal(writes,0);raw='broken json';assert.throws(()=>repo.load());assert.equal(writes,0);
});
test('storage errors surface instead of pretending save succeeded',()=>{
 const repo=createLocalRepository({getItem:()=>null,setItem:()=>{throw new Error('quota');}});
 assert.throws(()=>repo.save(createProfile()),/quota/);
});
test('failed boundary retry never captures later in-memory changes',async()=>{
 const {createBoundaryWriter}=await import('../src/core/storage.mjs');
 let saved,blocked=true;
 const writer=createBoundaryWriter({save(value){if(blocked)throw new Error('quota');saved=structuredClone(value);}});
 const p=createProfile();startRun(p,1,'CH01');
 assert.throws(()=>writer.save(p),/quota/);
 p.slots[0].activeRun.stamina=20;blocked=false;writer.retry();
 assert.equal(saved.slots[0].activeRun.stamina,100);
});
test('malformed character, stats, and schedule are rejected before UI loading',async()=>{
 const {validateProfile}=await import('../src/core/storage.mjs');
 const good=createProfile();startRun(good,1,'CH01');
 for(const mutate of [
  p=>p.slots[0].activeRun.characterId='missing',
  p=>p.slots[0].activeRun.stats.magic=-1,
  p=>Object.assign(p.slots[0].activeRun,{phase:'ACTING',schedule:[]}),
  p=>p.meta.counters.classes='bad',
  p=>p.slots[0].activeRun.runNumber=0,
 ]){
  const bad=structuredClone(good);mutate(bad);assert.throws(()=>validateProfile(bad));
 }
});
