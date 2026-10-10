import test from 'node:test';
import assert from 'node:assert/strict';
test('successful retry releases Adventure input only when no modal or pending save remains',async()=>{
 const {syncAdventurePause}=await import('../input-pause.mjs');
 const calls=[];const game={pause:value=>calls.push(value)};
 syncAdventurePause(game,{pending:true,modalOpen:true,windowPaused:false});
 syncAdventurePause(game,{pending:false,modalOpen:false,windowPaused:false});
 syncAdventurePause(game,{pending:false,modalOpen:true,windowPaused:false});
 syncAdventurePause(game,{pending:false,modalOpen:false,windowPaused:true});
 assert.deepEqual(calls,[true,false,true,true]);
});
