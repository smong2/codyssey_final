import test from 'node:test';
import assert from 'node:assert/strict';
import {createEngineServer} from '../server.mjs';
test('runtime WebP world, foreground and reduced collision are served without exposing asset docs or removed engine assets',async t=>{
 const server=createEngineServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const [file,type]of [['map01_greenhouse_world_3840x2160.webp','image/webp'],['map01_greenhouse_foreground_3840x2160.webp','image/webp'],['map01_greenhouse_collision_mask_1920x1080.png','image/png']]){
  const response=await fetch(base+'/design-assets/map/'+file);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),type);
 }
 assert.equal((await fetch(base+'/adventure-assets/collision-mask.png')).status,404);
 assert.equal((await fetch(base+'/design-assets/map/README.md')).status,404);
});
