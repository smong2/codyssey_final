import test from 'node:test';
import assert from 'node:assert/strict';
import {difficultyForStat,playDifficultyFor,growthForResult,validateGrowthRewardConfig} from '../src/core/minigame-contract.mjs';
import {createProfile,startRun,setSchedule,beginAction,applyAction,setGrowthRewardConfig} from '../src/core/state.mjs';
import {createMinigameResult} from '../src/core/minigame-contract.mjs';
import {validateProfile} from '../src/core/storage.mjs';

test('consecutive failures reduce only play difficulty while reward difficulty stays tied to stored stats',()=>{
 assert.deepEqual([0,1,2,3,4,6].map(n=>playDifficultyFor(4,n)),[4,4,3,3,2,2]);
 assert.equal(playDifficultyFor(1,8),1);
});

test('five consecutive failures remain saveable while assistance stays capped at two difficulty levels',()=>{
 let profile=createProfile();startRun(profile,1,'CH01').stats.magic=351;
 setSchedule(profile,1,Array(5).fill('rune-circuit'));
 for(let day=0;day<5;day++){
  const token=`1:1:${day}`,checkpoint=beginAction(profile,1,token);
  assert.equal(checkpoint.playDifficulty,[4,4,3,3,2][day]);
  const context={gameId:'rune-circuit',locationId:'workshop',difficulty:checkpoint.playDifficulty,seed:`failure-${day}`};
  applyAction(profile,1,token,createMinigameResult(context,'failure',0,100));
  profile=validateProfile(JSON.parse(JSON.stringify(profile)));
 }
 assert.equal(profile.slots[0].activeRun.consecutiveFails['rune-circuit'],5);
});

test('growth multipliers are validated and applied before low-stamina reduction',()=>{
 const config=validateGrowthRewardConfig({version:1,updatedAt:'2026-10-16T00:00:00.000Z',updatedBy:'admin',rewardMultiplier:{knowledge:.7,expression:1,dexterity:1,exploration:1,magic:1}});
 assert.equal(growthForResult('success',4,100,config.rewardMultiplier.knowledge),5);
 assert.equal(growthForResult('success',4,20,config.rewardMultiplier.knowledge),2);
 assert.throws(()=>validateGrowthRewardConfig({rewardMultiplier:{knowledge:1.1}}));
});

test('activity result uses the adjusted play difficulty but grows from the original reward difficulty',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');run.stats.magic=351;run.consecutiveFails={'rune-circuit':2};
 setSchedule(profile,1,['rune-circuit','rest','rest','rest','rest']);
 const checkpoint=beginAction(profile,1,'1:1:0');assert.equal(checkpoint.playDifficulty,3);assert.equal(checkpoint.rewardDifficulty,4);
 const context={gameId:'rune-circuit',locationId:'workshop',difficulty:3,rewardDifficulty:4,seed:'adjusted'};
 applyAction(profile,1,'1:1:0',createMinigameResult(context,'success',1,100));
 assert.equal(run.stats.magic,359);assert.equal(run.consecutiveFails['rune-circuit'],0);
});

test('an admin reward policy changes only finalized repeatable activity growth',()=>{
 const profile=createProfile(),run=startRun(profile,1,'CH01');run.stats.magic=351;
 setGrowthRewardConfig(profile,{version:1,rewardMultiplier:{magic:.5}});
 setSchedule(profile,1,['rune-circuit','rest','rest','rest','rest']);const checkpoint=beginAction(profile,1,'1:1:0');
 const context={gameId:'rune-circuit',locationId:'workshop',difficulty:checkpoint.playDifficulty,seed:'admin-policy'};
 applyAction(profile,1,'1:1:0',createMinigameResult(context,'success',1,100));
 assert.equal(run.stats.magic,355);
 assert.equal(profile.config.growthRewardConfig.rewardMultiplier.magic,.5);
});
