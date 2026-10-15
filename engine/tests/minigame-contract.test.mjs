import test from 'node:test';
import assert from 'node:assert/strict';
import {createMinigameResult,createMinigameStartData,difficultyForStat,growthForResult} from '../src/core/minigame-contract.mjs';

test('stat bands create the approved difficulty input without reading modified stats',()=>{
 assert.deepEqual([0,100,101,200,201,350,351,500].map(difficultyForStat),[1,1,2,2,3,3,4,4]);
 assert.deepEqual(createMinigameStartData({gameId:'rune-link',locationId:'library',statValue:201,seed:'run-1',rewardInputs:null}),
  {gameId:'rune-link',locationId:'library',difficulty:3,seed:'run-1',maxDurationMs:180000,rewardInputs:null});
 assert.throws(()=>difficultyForStat(501));
});

test('all terminal outcomes share one result shape and retain opaque reward inputs',()=>{
 const context=createMinigameStartData({gameId:'rune-link',locationId:'library',statValue:101,seed:'s',rewardInputs:{candidate:'kept'} });
 for(const outcome of ['success','failure','greatSuccess','timeout','quit']){
  const result=createMinigameResult(context,outcome,12.6,20.4,{matches:3});
  assert.deepEqual(Object.keys(result),['gameId','locationId','outcome','score','durationMs','difficulty','seed','metrics','rewardInputs']);
  assert.equal(result.outcome,outcome);assert.equal(result.score,13);assert.equal(result.durationMs,20);
  assert.equal(result.rewardInputs.candidate,'kept');
 }
 assert.throws(()=>createMinigameResult(context,'unknown',0,0));
});

test('approved growth maps outcome and difficulty, halves only the confirmed low-stamina band',()=>{
 assert.deepEqual([1,2,3,4].map(d=>growthForResult('success',d,100)),[5,6,7,8]);
 assert.deepEqual([1,2,3,4].map(d=>growthForResult('failure',d,100)),[0,1,2,3]);
 assert.equal(growthForResult('greatSuccess',4,100),10);
 assert.equal(growthForResult('success',3,30),3);
 assert.equal(growthForResult('failure',4,10),1);
 assert.equal(growthForResult('greatSuccess',1,9),10);
 assert.equal(growthForResult('timeout',4,100),0);
 assert.equal(growthForResult('quit',4,100),0);
});
