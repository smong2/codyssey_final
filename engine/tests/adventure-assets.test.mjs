import test from 'node:test';
import assert from 'node:assert/strict';
import {createEngineServer} from '../server.mjs';
import {sdCharacterStrip} from '../src/core/sd-characters.mjs';
test('runtime WebP world, foreground and reduced collision are served without exposing asset docs or removed engine assets',async t=>{
 const server=createEngineServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const [file,type]of [['MP01_greenhouse_world_3840x2160.webp','image/webp'],['MP01_greenhouse_foreground_3840x2160.webp','image/webp'],['MP01_greenhouse_collision_mask_1920x1080.png','image/png']]){
  const response=await fetch(base+'/design-assets/map/'+file);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),type);
 }
 assert.equal((await fetch(base+'/adventure-assets/collision-mask.png')).status,404);
 assert.equal((await fetch(base+'/design-assets/map/README.md')).status,404);
});
test('all six character walking sets can be served without exposing SD documentation',async t=>{
 const server=createEngineServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const id of ['CH01','CH02','CH08','CH15','CH16','CH31'])for(const direction of ['S','SW','W','NW','N','NE','E','SE']){
  const response=await fetch(base+sdCharacterStrip(id,direction).slice(1));assert.equal(response.status,200,id+' '+direction);assert.equal(response.headers.get('content-type'),'image/png');
 }
 assert.throws(()=>sdCharacterStrip('unknown','S'));assert.throws(()=>sdCharacterStrip('CH01','unknown'));
 assert.equal((await fetch(base+'/design-assets/sd_character/README.md')).status,404);
});
