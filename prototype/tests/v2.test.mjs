import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../state.mjs';
import * as persistence from '../storage.mjs';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),values};};
const content={title:'빛을 잃은 온실',choices:[{id:'together',label:'선생님께 같이 이야기하러 갈까?'}],reflections:[{id:'flower',label:'유리꽃을 가까이에서 살펴본 순간'}]};

test('confirm is restricted to Kael and other cards do not persist a profile',()=>{
 const s=model.freshState();assert.equal(s.version,2);
 assert.equal(typeof model.applyEvent,'function');
 assert.throws(()=>model.applyEvent(s,{type:'confirm',id:'CH02'},content));
 const next=model.applyEvent(s,{type:'confirm',id:'CH01'},content);
 assert.equal(next.selectedCharacterName,'카엘');assert.equal(next.characterConfirmed,true);assert.equal(s.characterConfirmed,false);
});
test('knowledge preserves discovery order without duplicates and herb is only an Item',()=>{
 const s=model.freshState();model.inspectFact(s,'greenhouseSunlight');model.inspectFact(s,'glassFlowerSoil');model.inspectFact(s,'greenhouseSunlight');model.collectHerb(s);model.collectHerb(s);
 assert.deepEqual(s.knowledge,['greenhouseSunlight','glassFlowerSoil']);assert.equal(s.herbs,1);
 assert.throws(()=>model.inspectFact(s,'unobservedCause'));
});
test('reward is forbidden before Diary and record generation is not itself a reward',()=>{
 const s=model.freshState();assert.throws(()=>model.applyEvent(s,{type:'reward'},content));
 s.reflection='flower';s.reflectionCompleted=true;s.choice='together';s.episode1Status='resolved';
 const saved=model.applyEvent(s,{type:'diary'},content);
 assert.equal(saved.heartRecords.length,1);assert.equal(saved.heartBalance,0);assert.equal(saved.dayEndUnlocked,false);
 assert.equal(model.applyEvent(saved,{type:'diary'},content).heartRecords.length,1);
});
test('episode reward is exactly once and independent of choice, hint, optional collection',()=>{
 for(const choice of ['together','time','ask']){
  const s=model.freshState();s.choice=choice;s.diarySaved=true;s.hint=3;s.episode1Status='resolved';
  const n=model.applyEvent(s,{type:'reward'},content);
  assert.equal(n.heartBalance,100);assert.equal(n.rewardReason,'EPISODE_COMPLETION_REWARD');assert.equal(n.dayEndUnlocked,true);
  assert.equal(model.applyEvent(n,{type:'reward'},content).heartBalance,100);
 }
});
test('solved rune permits Sion dialogue without herb or recovered flower reinspection',()=>{
 const s=model.freshState();s.scene='adventure';model.recoverWorld(s);
 const n=model.applyEvent(s,{type:'return-sion'},content);assert.equal(n.scene,'reaction');assert.equal(n.flowerRecoveredSeen,false);assert.equal(n.herbs,0);
});
test('day end loads directly into morning and preserves private record, choice and currency',()=>{
 const s=model.freshState();s.selectedCharacterId='CH01';s.selectedCharacterName='카엘';s.characterConfirmed=true;s.diarySaved=true;s.dayEndUnlocked=true;s.episode1HeartRewardClaimed=true;s.episode1Status='completed';s.heartBalance=100;s.rewardReason='EPISODE_COMPLETION_REWARD';s.choice='together';s.reflection='flower';s.reflectionCompleted=true;s.heartRecords=[{id:'EP01',choice:'together',reflection:'flower'}];
 const n=model.applyEvent(s,{type:'day-end'},content);assert.equal(n.dayIndex,2);assert.equal(n.timeOfDay,'morning');
 const storage=memory();assert.equal(persistence.saveState(n,storage),true);
 const loaded=persistence.loadSave(storage).state;assert.equal(loaded.scene,'morning');assert.equal(loaded.heartBalance,100);assert.equal(loaded.heartRecords.length,1);
});
test('Bern short-talk only saves seen flag and never re-rewards or persists Small Choice',()=>{
 const s=model.freshState();s.scene='roomFree';s.heartBalance=100;
 const n=model.applyEvent(s,{type:'bern-talk-complete'},content);assert.equal(n.bernShortTalkSeen,true);assert.equal(n.heartBalance,100);assert.equal(n.scene,'roomFree');
 assert.equal('bernChoice' in n,false);assert.equal(n.reflection,null);
});
test('failed transactional save holds previous scene; retry commits pending transition exactly once',()=>{
 const s=model.freshState();const next={...s,scene:'admission'};
 const failure=persistence.commitState(s,next,{setItem(){throw Error('quota');}});
 assert.equal(failure.ok,false);assert.equal(failure.state.scene,'entry');assert.equal(s.scene,'entry');
 const retry=persistence.commitState(s,next,memory());assert.equal(retry.ok,true);assert.equal(retry.state.scene,'admission');
});
test('new v2 progress never overwrites old v1 key',()=>{
 const storage=memory();storage.setItem('lumia-greenhouse-v1','old untouched');persistence.saveState(model.freshState(),storage);
 assert.equal(storage.getItem('lumia-greenhouse-v1'),'old untouched');assert.ok(storage.getItem('lumia-greenhouse-v2'));
});
