import test from 'node:test';
import assert from 'node:assert/strict';
import {createLumiaApiProvider,installLumiaApiProvider,LumiaApiError} from '../src/services/api-provider.mjs';

const response=(status,data)=>({ok:status>=200&&status<300,status,async json(){return data;}});

test('provider installer preserves the preinstalled account service and adds server API methods',()=>{
 const account={getSession:async()=>null},target={lumiaEngineServices:{account}};
 const installed=installLumiaApiProvider({baseUrl:'https://api.example',getIdToken:async()=>'token',maxAttempts:1,fetchImpl:async()=>response(200,{})},target);
 assert.equal(installed,target.lumiaEngineServices);assert.equal(installed.account,account);
 for(const name of ['bootstrapAccount','listSaveSlots','startRun','loadDialogue','completeDialogue','getCollection','prepareEnding','finishEnding'])assert.equal(typeof installed[name],'function',name);
});

test('API provider sends the Firebase token and exact mutation body',async()=>{
 const calls=[];const provider=createLumiaApiProvider({baseUrl:'https://api.example/',getIdToken:async()=>'token-secret',maxAttempts:1,fetchImpl:async(url,init)=>{calls.push({url,init});return response(200,{ok:true});}});
 const body={requestId:'req-1',expectedServerRevision:7,characterId:'CH01'};
 await provider.startRun(2,body);
 assert.equal(calls[0].url,'https://api.example/v1/save-slots/2/runs');
 assert.equal(calls[0].init.headers.Authorization,'Bearer token-secret');
 assert.deepEqual(JSON.parse(calls[0].init.body),body);
 assert.equal(calls[0].init.method,'POST');
});

test('unreadable slot deletion is the only mutation that does not guess a revision',async()=>{
 const calls=[];const provider=createLumiaApiProvider({baseUrl:'https://api.example',getIdToken:async()=>'token',maxAttempts:1,fetchImpl:async(url,init)=>{calls.push({url,init});return response(200,{serverRevision:0});}});
 const body={requestId:'delete-broken',confirm:true,resetUnreadable:true};await provider.deleteUnreadableSaveSlot(3,body);
 assert.equal(calls[0].init.method,'DELETE');assert.deepEqual(JSON.parse(calls[0].init.body),body);
});

test('account bootstrap sends the reviewed privacy consent version before slot usage',async()=>{
 const calls=[];const provider=createLumiaApiProvider({baseUrl:'https://api.example',getIdToken:async()=>'token',maxAttempts:1,fetchImpl:async(url,init)=>{calls.push({url,init});return response(200,{created:false});}});
 await provider.bootstrapAccount({privacyConsentAccepted:true,privacyConsentVersion:'2026-10-15'});
 assert.equal(calls[0].url,'https://api.example/v1/account/bootstrap');
 assert.deepEqual(JSON.parse(calls[0].init.body),{privacyConsentAccepted:true,privacyConsentVersion:'2026-10-15'});
 assert.throws(()=>provider.bootstrapAccount({privacyConsentAccepted:true,privacyConsentVersion:'old'}),error=>error.code==='VALIDATION');
});

test('account settings patch is idempotent and uses the authenticated account path',async()=>{
 const calls=[];const provider=createLumiaApiProvider({baseUrl:'https://api.example',getIdToken:async()=>'token',maxAttempts:1,fetchImpl:async(url,init)=>{calls.push({url,init});return response(200,{activePetId:'PET02',activeRoomBackgroundId:'ROOM_DEFAULT'});}});
 await provider.updateAccountSettings({activePetId:'PET02'});
 assert.equal(calls[0].url,'https://api.example/v1/account/settings');assert.equal(calls[0].init.method,'PATCH');assert.deepEqual(JSON.parse(calls[0].init.body),{activePetId:'PET02'});
 assert.throws(()=>provider.updateAccountSettings({}),error=>error.code==='VALIDATION');
});

test('ending preparation gets a longer client timeout than ordinary API calls',async()=>{
 const provider=createLumiaApiProvider({baseUrl:'https://api.example',getIdToken:async()=>'token',timeoutMs:10,endingTimeoutMs:100,maxAttempts:1,fetchImpl:async()=>{await new Promise(resolve=>setTimeout(resolve,30));return response(200,{recordId:'run-1'});}});
 const result=await provider.prepareEnding(1,{requestId:'ending-1',expectedServerRevision:2});assert.equal(result.recordId,'run-1');
 assert.throws(()=>createLumiaApiProvider({baseUrl:'https://api.example',getIdToken:async()=>'token',timeoutMs:100,endingTimeoutMs:50}),/timeout/);
});

test('ending preparation does not automatically duplicate a long-running generation request',async()=>{
 let calls=0;const provider=createLumiaApiProvider({baseUrl:'https://api.example',getIdToken:async()=>'token',maxAttempts:2,fetchImpl:async()=>{calls++;return response(503,{detail:'generator unavailable'});}});
 await assert.rejects(()=>provider.prepareEnding(1,{requestId:'ending-stable',expectedServerRevision:2}));assert.equal(calls,1);
});

test('retry reuses the same requestId and serialized body',async()=>{
 const bodies=[];let count=0;const provider=createLumiaApiProvider({baseUrl:'https://api.example',getIdToken:async()=>'token',maxAttempts:2,fetchImpl:async(_url,init)=>{bodies.push(init.body);return ++count===1?response(503,{detail:'temporary'}):response(200,{serverRevision:4});}});
 const input={requestId:'stable-id',expectedServerRevision:3,inputLog:[{atMs:1,action:'tap'}]};
 const result=await provider.completeClassReplay(1,input);
 assert.equal(result.serverRevision,4);assert.equal(bodies.length,2);assert.equal(bodies[0],bodies[1]);assert.equal(JSON.parse(bodies[1]).requestId,'stable-id');
});

test('provider maps API failures without exposing the bearer token',async()=>{
 const provider=createLumiaApiProvider({baseUrl:'https://api.example',getIdToken:async()=>'super-secret-token',maxAttempts:1,fetchImpl:async()=>response(409,{detail:'RevisionConflict'})});
 await assert.rejects(()=>provider.completeDialogue({dialogueToken:'opaque',completionMode:'COMPLETE',selectedChoices:[],requestId:'r1',expectedServerRevision:1}),error=>{
  assert.ok(error instanceof LumiaApiError);assert.equal(error.code,'CONFLICT');assert.equal(error.status,409);assert.doesNotMatch(error.message,/super-secret-token/);return true;
 });
});

test('dialogue load encodes the event id and GET can retry a transient network failure',async()=>{
 const urls=[];let count=0;const provider=createLumiaApiProvider({baseUrl:'https://api.example',getIdToken:async()=>'token',maxAttempts:2,fetchImpl:async url=>{urls.push(url);if(++count===1)throw new TypeError('offline');return response(200,{eventId:'NPC A/1'});}});
 const value=await provider.loadDialogue({slotId:4,eventId:'NPC A/1'});
 assert.equal(value.eventId,'NPC A/1');assert.equal(urls.length,2);assert.match(urls[0],/NPC%20A%2F1$/);
});

test('dialogue load does not automatically repeat an HTTP 503',async()=>{
 let calls=0;const provider=createLumiaApiProvider({baseUrl:'https://api.example',getIdToken:async()=>'token',maxAttempts:3,fetchImpl:async()=>{calls++;return response(503,{detail:'Image asset is not delivered'});}});
 await assert.rejects(()=>provider.loadDialogue({slotId:1,eventId:'LOC_GH_01'}),error=>error.status===503);
 assert.equal(calls,1);
});
