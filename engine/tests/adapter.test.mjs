import test from 'node:test';
import assert from 'node:assert/strict';
test('all seven preview scenes emit one result and quit returns home',async()=>{
 globalThis.Phaser={Scene:class{constructor(key){this.gameId=key;}}};
 const {previewScenes}=await import('../src/scenes/PreviewScenes.mjs');assert.equal(previewScenes.length,7);
 for(const Scene of previewScenes){const scene=new Scene(),events=[],destinations=[];
 scene.game={events:{emit:(...args)=>events.push(args)}};scene.scene={start:(...args)=>destinations.push(args)};scene.init({seed:'preview'});scene.startedAt=performance.now();
 scene.finish('quit');scene.finish('timeout');assert.equal(events.length,1);assert.equal(events[0][0],'minigame:quit');assert.equal(events[0][1].gameId,scene.gameId);assert.deepEqual(destinations,[['home']]);}
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
