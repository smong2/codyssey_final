import {validateState} from './state.mjs';
export const SAVE_KEY='lumia-greenhouse-v1';
export function loadSave(storage=localStorage){try{const raw=storage.getItem(SAVE_KEY);if(!raw)return {state:null,error:null};const state=JSON.parse(raw);return validateState(state)?{state,error:null}:{state:null,error:'이전 기록을 읽을 수 없어요. 새 이야기로 시작해 주세요.'};}catch{return {state:null,error:'기록을 읽을 수 없어요. 브라우저의 저장 설정을 확인해 주세요.'};}}
export function saveState(state,storage=localStorage){try{storage.setItem(SAVE_KEY,JSON.stringify(state));return true;}catch{return false;}}
