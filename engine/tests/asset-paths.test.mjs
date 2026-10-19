import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createEngineServer} from '../server.mjs';
import {assetReference} from '../src/core/asset-paths.mjs';
test('renamed main assets support both previous save URLs and canonical design filenames',async t=>{
 const server=createEngineServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base='http://127.0.0.1:'+server.address().port;
 for(const [oldPath,newPath]of [
  ['/world-assets/BG03_myroom2_day_1920x1080_023.png','/world-assets/BG11_myroom2_day_1920x1080_023.png'],
  ['/design-assets/bern/owl1.png','/design-assets/pet/PT01_owl.png'],
  ['/design-assets/map/map01_greenhouse_foreground_3840x2160-1.png','/design-assets/map/MP01_greenhouse_foreground_3840x2160-1.png']
 ]){const digests=[];for(const route of [oldPath,newPath]){const response=await fetch(base+route);assert.equal(response.status,200,route);assert.equal(response.headers.get('cache-control'),'no-store');digests.push(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'));}assert.equal(digests[0],digests[1]);}
 assert.deepEqual(assetReference('background','BG05_grand_library_1920x1080_014.png'),{category:'background',file:'BG04_grand_library_1920x1080_014.png'});
 assert.equal((await fetch(base+'/design-assets/pet/README.md')).status,404);
 assert.equal((await fetch(base+'/design-assets/pet/../../.git/config')).status,404);
});
