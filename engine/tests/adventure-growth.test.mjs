import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfile,startRun,setSchedule,beginAction,applyAction} from '../src/core/state.mjs';
import {createAdventureStartData,createAdventureResult} from '../src/core/adventure-contract.mjs';
import {validateProfile} from '../src/core/storage.mjs';

for(const scenario of [
 {name:'low stamina halves successful growth only once',stamina:20,outcome:'MISSION_COMPLETE',foundCount:5,want:4},
 {name:'low stamina preserves the final timeout minimum',stamina:20,outcome:'TIMEOUT',foundCount:1,want:1},
 {name:'reward multiplier preserves the final timeout minimum',stamina:100,multiplier:0.5,outcome:'TIMEOUT',foundCount:1,want:1},
 {name:'zero discoveries do not receive the timeout minimum',stamina:20,multiplier:0.5,outcome:'TIMEOUT',foundCount:0,want:0},
 {name:'successful growth still respects the reward multiplier',stamina:20,multiplier:0.5,outcome:'MISSION_COMPLETE',foundCount:5,want:2},
 {name:'the stat cap still overrides the timeout minimum',stamina:20,exploration:500,outcome:'TIMEOUT',foundCount:1,want:0},
 {name:'successful growth is capped at 500',stamina:100,exploration:499,outcome:'MISSION_COMPLETE',foundCount:5,want:1},
])test(`adventure: ${scenario.name}`,()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');
 run.stats.exploration=scenario.exploration??351;run.stamina=scenario.stamina;
 profile.config.growthRewardConfig={rewardMultiplier:{exploration:scenario.multiplier??1}};
 setSchedule(profile,1,['adventure','rest','rest','rest','rest']);
 const before=run.stats.exploration;
 beginAction(profile,1,'1:1:0');
 const context=createAdventureStartData({missionId:'growth-test',locationId:'greenhouse',seed:'growth-test',storedExploration:before});
 const result=createAdventureResult(context,scenario.outcome,{foundCount:scenario.foundCount,successGrowth:8,stamina:scenario.stamina});
 assert.equal(applyAction(profile,1,'1:1:0',result),true);
 assert.equal(run.stats.exploration,before+scenario.want);
 assert.equal(run.actionHistory[0].effect.growth.exploration,scenario.want);
 assert.equal(run.day,1);assert.equal(run.stamina,scenario.stamina-15);
 assert.equal(applyAction(profile,1,'1:1:0',result),false);
 assert.doesNotThrow(()=>validateProfile(profile));
});
