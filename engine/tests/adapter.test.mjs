import test from 'node:test';
import assert from 'node:assert/strict';
import {classOf} from '../src/core/classes.mjs';
test('all seven preview scenes emit one result and quit returns home',async()=>{
 globalThis.Phaser={Scene:class{constructor(key){this.gameId=key;}}};
 const {previewScenes}=await import('../src/scenes/PreviewScenes.mjs');assert.equal(previewScenes.length,7);
 for(const Scene of previewScenes){const scene=new Scene(),events=[],destinations=[];
 scene.game={events:{emit:(...args)=>events.push(args)}};scene.scene={start:(...args)=>destinations.push(args)};scene.init({gameId:scene.gameId,locationId:classOf(scene.gameId).locationId,difficulty:1,seed:'preview',rewardInputs:null});scene.startedAt=performance.now();
 scene.finish('quit');scene.finish('timeout');assert.equal(events.length,1);assert.equal(events[0][0],'minigame:quit');assert.equal(events[0][1].gameId,scene.gameId);assert.deepEqual(destinations,[['home']]);}
});
test('all seven preview games return the shared engine result contract',async()=>{
 globalThis.Phaser={Scene:class{constructor(key){this.gameId=key;}}};
 const {previewScenes}=await import('../src/scenes/PreviewScenes.mjs');
 const expected=['gameId','locationId','outcome','score','durationMs','difficulty','seed','metrics','rewardInputs'];
 for(const Scene of previewScenes)for(const outcome of ['success','failure','greatSuccess','timeout','quit']){
  const scene=new Scene(),events=[],destinations=[];scene.game={events:{emit:(...args)=>events.push(args)}};
  const locationId=classOf(scene.gameId).locationId;
  scene.scene={start:(...args)=>destinations.push(args)};scene.init({gameId:scene.gameId,difficulty:2,locationId,seed:'contract-test',maxDurationMs:120000,rewardInputs:null});
  scene.startedAt=performance.now();scene.finish(outcome,{stagesCleared:3});scene.finish(outcome);
  assert.equal(events.length,1);assert.deepEqual(Object.keys(events[0][1]).sort(),[...expected].sort());
  assert.equal(events[0][0],outcome==='quit'?'minigame:quit':'minigame:complete');
  assert.equal(events[0][1].gameId,scene.gameId);assert.equal(events[0][1].locationId,locationId);
  assert.equal(events[0][1].outcome,outcome);assert.equal(events[0][1].difficulty,2);
  assert.deepEqual(destinations,[['home']]);
 }
});
test('engine scene emits once and returns home without demo result/menu',async()=>{
 globalThis.Phaser={Scene:class{constructor(key){this.gameId=key;}}};
 const {EngineRuneCircuitScene}=await import('../src/scenes/EngineRuneCircuitScene.mjs');
 const scene=new EngineRuneCircuitScene();const emitted=[],transitions=[];
 scene.game={events:{emit:(...args)=>emitted.push(args)}};
 scene.scene={start:(...args)=>transitions.push(args)};
 scene.init({seed:'test'});scene.startedAt=performance.now();scene.score=12;
 scene.finish('success',{roundsCleared:3});scene.finish('success');
 assert.equal(emitted.length,1);assert.equal(emitted[0][0],'minigame:complete');
 assert.equal(emitted[0][1].gameId,'rune-circuit');assert.equal(emitted[0][1].score,12);
 assert.deepEqual(transitions,[['home']]);
 scene.init();scene.finish('quit');assert.equal(emitted[1][0],'minigame:quit');
});
