import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForApiReady} from '../src/services/api-health.mjs';

const response=status=>({ok:status>=200&&status<300,status});

test('API health warm-up retries a cold service and succeeds before game bootstrap',async()=>{
 const urls=[];let calls=0;
 const result=await waitForApiReady({
  baseUrl:'https://api.example/',attemptTimeouts:[50,50],retryDelayMs:0,
  fetchImpl:async url=>{urls.push(url);return response(++calls===1?503:200);},
 });
 assert.deepEqual(result,{ready:true,attempts:2,status:200});
 assert.deepEqual(urls,['https://api.example/health','https://api.example/health']);
});

test('API health warm-up does not retry a non-transient client error',async()=>{
 let calls=0;
 await assert.rejects(()=>waitForApiReady({
  baseUrl:'https://api.example',attemptTimeouts:[50,50],retryDelayMs:0,
  fetchImpl:async()=>{calls++;return response(404);},
 }),/\(404\)/);
 assert.equal(calls,1);
});
