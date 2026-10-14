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

test('server serves only the approved title music files with streaming metadata',async t=>{
 const {createEngineServer}=await import('../server.mjs');
 const server=createEngineServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const path of ['/audio-assets/bgm_title_intro.MP3','/audio-assets/bgm_title_main.mp3']){
  const response=await fetch(base+path,{method:'HEAD'});
  assert.equal(response.status,200,path);
  assert.equal(response.headers.get('content-type'),'audio/mpeg',path);
  assert.equal(response.headers.get('accept-ranges'),'bytes',path);
 }
 const range=await fetch(base+'/audio-assets/bgm_title_intro.MP3',{headers:{Range:'bytes=0-15'}});
 assert.equal(range.status,206);
 assert.equal(range.headers.get('content-range').startsWith('bytes 0-15/'),true);
 assert.equal((await range.arrayBuffer()).byteLength,16);
 assert.equal((await fetch(base+'/audio-assets/README.md')).status,404);
});
