import {beginAction,applyAction} from '../src/core/state.mjs';

// Existing state-flow tests use a single helper for start + completion. The
// checkpoint-specific suite calls beginAction/applyAction separately.
export function runAction(profile,slotId,token,result,random=Math.random){
 const run=profile.slots[slotId-1].activeRun;
 if(token!==run.lastAction&&!run.inProgressActivity)beginAction(profile,slotId,token);
 return applyAction(profile,slotId,token,result,random);
}
