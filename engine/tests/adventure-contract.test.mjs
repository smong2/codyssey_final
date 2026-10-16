import test from 'node:test';
import assert from 'node:assert/strict';
import {adventureDurationSeconds,adventureObjectiveCount,createAdventureStartData,createAdventureResult} from '../src/core/adventure-contract.mjs';

test('adventure uses saved exploration for difficulty and pet-adjusted exploration for time only',()=>{
 assert.deepEqual([0,100,101,200,201,350,351,500].map(value=>adventureObjectiveCount(value,value===201||value===350?3:undefined)),[1,1,2,2,3,3,5,5]);
 assert.equal(adventureDurationSeconds(0),120);
 assert.equal(adventureDurationSeconds(50),120);
 assert.equal(adventureDurationSeconds(275),180);
 assert.equal(adventureDurationSeconds(500),240);
 assert.equal(adventureDurationSeconds(450,50),240);
 assert.throws(()=>adventureObjectiveCount(250));
});

test('adventure start contract requires a mission master objective count for the 3/4 band',()=>{
 const input=createAdventureStartData({missionId:'mission-1',locationId:'greenhouse',seed:'run-1-week-1-day-0',storedExploration:250,petExplorationBonus:20,objectiveCount:4});
 assert.deepEqual(input,{gameId:'adventure',missionId:'mission-1',locationId:'greenhouse',seed:'run-1-week-1-day-0',difficulty:3,objectiveCount:4,durationSeconds:179});
 assert.throws(()=>createAdventureStartData({missionId:'mission-1',locationId:'greenhouse',seed:'s',storedExploration:250}));
 assert.throws(()=>createAdventureStartData({missionId:'',locationId:'greenhouse',seed:'s',storedExploration:50}));
});

test('mission results distinguish success, timeout, and interruption without inventing permanent rewards',()=>{
 const context={gameId:'adventure',missionId:'m1',locationId:'greenhouse',seed:'s',difficulty:2,objectiveCount:2};
 assert.deepEqual(createAdventureResult(context,'MISSION_COMPLETE',{foundCount:2,successGrowth:8}),{...context,outcome:'MISSION_COMPLETE',foundCount:2,successGrowth:8,explorationGrowth:8,rewardInputs:null});
 assert.equal(createAdventureResult(context,'TIMEOUT',{foundCount:1,successGrowth:8}).explorationGrowth,2);
 assert.equal(createAdventureResult(context,'TIMEOUT',{foundCount:1,successGrowth:7,stamina:30}).explorationGrowth,1);
 assert.equal(createAdventureResult(context,'TIMEOUT',{foundCount:0,successGrowth:8}).explorationGrowth,0);
 assert.equal(createAdventureResult(context,'INTERRUPTED',{foundCount:1}).explorationGrowth,0);
 assert.throws(()=>createAdventureResult(context,'MISSION_COMPLETE',{foundCount:1}));
 assert.throws(()=>createAdventureResult(context,'TIMEOUT',{foundCount:2}));
 assert.throws(()=>createAdventureResult(context,'TIMEOUT',{foundCount:1,successGrowth:1.5}));
});
