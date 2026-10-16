import test from 'node:test';
import assert from 'node:assert/strict';
import {createEngineServer} from '../server.mjs';
test('bag can load approved item and badge PNGs but not arbitrary design documents',async t=>{
 const server=createEngineServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 for(const path of ['/design-assets/item/diary1_heart.png','/design-assets/badge/badge_state_locked_038.png']){const response=await fetch(base+path);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');}
 assert.equal((await fetch(base+'/design-assets/badge/README.md')).status,404);
});
