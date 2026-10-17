import test from 'node:test';
import assert from 'node:assert/strict';
test('server serves only engine and approved assets',async t=>{
 const {createEngineServer}=await import('../server.mjs');
 const server=createEngineServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const path of ['/', '/src/core/state.mjs','/minigame-demo/vendor/phaser.min.js','/world-assets/BG10_myroom1_day_1920x1080_012.png','/character-assets/kael0_fullbody.png']){
  assert.equal((await fetch(base+path)).status,200,path);
 }
 for(const path of ['/.git/config','/document/03_CHARACTERS.md','/src/%2e%2e%2f%2e%2e%2fAGENTS.md','/not-found']){
  assert.notEqual((await fetch(base+path)).status,200,path);
 }
});

test('server serves only the approved game music and button sound files with streaming metadata',async t=>{
 const {createEngineServer,resolveAudioAssetFilename}=await import('../server.mjs');
 const server=createEngineServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const path of ['/audio-assets/bgm_title_intro.mp3','/audio-assets/bgm_title_main.mp3','/audio-assets/bgm_admission_invitation.mp3','/audio-assets/bgm_myroom.mp3','/audio-assets/sfx_button_click.mp3','/audio-assets/sfx_diary_open.mp3']){
  const response=await fetch(base+path,{method:'HEAD'});
  assert.equal(response.status,200,path);
  assert.equal(response.headers.get('content-type'),'audio/mpeg',path);
  assert.equal(response.headers.get('accept-ranges'),'bytes',path);
 }
 assert.equal(resolveAudioAssetFilename('/audio-assets/sfx_button_click.mp3'),'sfx_button_click.mp3');
 assert.equal(resolveAudioAssetFilename('/audio-assets/bgm_title_intro.mp3'),'bgm_title_intro.mp3');
 assert.equal(resolveAudioAssetFilename('/audio-assets/sfx_button_click.MP3'),null);
 assert.equal((await fetch(base+'/audio-assets/sfx_button_click.MP3',{method:'HEAD'})).status,404);
 const range=await fetch(base+'/audio-assets/bgm_title_intro.mp3',{headers:{Range:'bytes=0-15'}});
 assert.equal(range.status,206);
 assert.equal(range.headers.get('content-range').startsWith('bytes 0-15/'),true);
 assert.equal((await range.arrayBuffer()).byteLength,16);
 assert.equal((await fetch(base+'/audio-assets/README.md')).status,404);
 assert.equal((await fetch(base+'/audio-assets/bgm_clocktower_plaza.mp3')).status,404);
});

test('server serves Korean puzzle image filenames without exposing sibling files',async t=>{
 const {createEngineServer}=await import('../server.mjs');
 const server=createEngineServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 const puzzle=await fetch(base+'/design-assets/puzzle/PZ01_우주방_01.png');
 assert.equal(puzzle.status,200);
 assert.equal(puzzle.headers.get('content-type'),'image/png');
 assert.equal((await fetch(base+'/design-assets/puzzle/README.md')).status,404);
 assert.equal((await fetch(base+'/design-assets/puzzle/../README.md')).status,404);
});
