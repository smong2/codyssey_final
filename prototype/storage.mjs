import {validateState} from './state.mjs';
export const SAVE_KEY='lumia-greenhouse-v2';
export function loadSave(storage=globalThis.localStorage){
 try{const raw=storage.getItem(SAVE_KEY);if(!raw)return {state:null,error:null};const state=JSON.parse(raw);
  if(!validateState(state))return {state:null,error:'이야기의 기록을 읽지 못했어요. 다시 시도해 주세요.'};
  if(['bernTalk','bernTalkChoice','bernTalkReaction','bernRepeat'].includes(state.scene)){state.scene='roomFree';state.node=0;}
  if(state.scene==='dayEnd'){state.scene='morning';state.node=0;}
  return {state,error:null};
 }catch{return {state:null,error:'기록을 읽지 못했어요. 다시 시도해 주세요.'};}
}
export function saveState(state,storage=globalThis.localStorage){try{storage.setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}}
export function commitState(previous,next,storage=globalThis.localStorage){const ok=saveState(next,storage);return {ok,state:ok?next:previous};}
