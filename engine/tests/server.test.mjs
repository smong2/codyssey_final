import test from 'node:test';
import assert from 'node:assert/strict';
test('server serves only engine and approved assets',async t=>{
 const {createEngineServer}=await import('../server.mjs');
 const server=createEngineServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const path of ['/', '/src/core/state.mjs','/minigame-demo/vendor/phaser.min.js','/world-assets/BG03_myroom1_day_1920x1080_012.png','/character-assets/kael1_base.png']){
  assert.equal((await fetch(base+path)).status,200,path);
 }
 for(const path of ['/.git/config','/document/03_CHARACTERS.md','/src/%2e%2e%2f%2e%2e%2fAGENTS.md','/not-found']){
  assert.notEqual((await fetch(base+path)).status,200,path);
 }
});
