import test from 'node:test';
import assert from 'node:assert/strict';
test('video range resolves bounded, open and suffix requests and rejects invalid',async()=>{
 const {parseRange}=await import('../media-range.mjs');
 assert.deepEqual(parseRange('bytes=0-99',1000),{start:0,end:99});
 assert.deepEqual(parseRange('bytes=900-',1000),{start:900,end:999});
 assert.deepEqual(parseRange('bytes=-50',1000),{start:950,end:999});
 assert.equal(parseRange('bytes=1000-',1000),null);assert.equal(parseRange('bytes=5-2',1000),null);
});
