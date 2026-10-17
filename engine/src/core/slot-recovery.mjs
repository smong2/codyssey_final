import {createProfile} from './state.mjs';
import {STORAGE_KEY,validateProfile} from './storage.mjs';

const GENERIC_ERROR='저장 기록을 확인할 수 없습니다.';
const emptySlot=slotId=>({slotId,status:'EMPTY',completedRunCount:0,activeRun:null,lastSavedAt:null});
const loadErrorSlot=slotId=>({slotId,status:'LOAD_ERROR'});

function parseRaw(raw){
 if(raw===null)return createProfile();
 return JSON.parse(raw);
}
function validateGlobalEnvelope(profile){
 if(!Array.isArray(profile?.slots)||profile.slots.length!==5)throw new Error('저장 슬롯 구성이 손상됐습니다.');
 const baseline=structuredClone(profile);baseline.slots=Array.from({length:5},(_,index)=>emptySlot(index+1));
 return validateProfile(baseline);
}
function slotIsValid(envelope,slot,slotId){
 try{const candidate=structuredClone(envelope);candidate.slots[slotId-1]=slot;validateProfile(candidate);return true;}catch{return false;}
}

export function inspectLocalSlots(storage){
 let raw;
 try{raw=storage.getItem(STORAGE_KEY);}catch{return {profile:null,slots:Array.from({length:5},(_,index)=>loadErrorSlot(index+1)),canDelete:false,error:GENERIC_ERROR};}
 if(raw===null){const profile=createProfile();return {profile,slots:profile.slots,canDelete:true,error:null};}
 let saved;
 try{saved=parseRaw(raw);}catch{return {profile:null,slots:Array.from({length:5},(_,index)=>loadErrorSlot(index+1)),canDelete:false,error:GENERIC_ERROR};}
 let envelope;
 try{envelope=validateGlobalEnvelope(saved);}catch{return {profile:null,slots:Array.from({length:5},(_,index)=>loadErrorSlot(index+1)),canDelete:false,error:GENERIC_ERROR};}
 const slots=saved.slots.map((slot,index)=>slotIsValid(envelope,slot,index+1)?slot:loadErrorSlot(index+1));
 const allValid=slots.every(slot=>slot.status!=='LOAD_ERROR');
 if(allValid){
  try{validateProfile(saved);return {profile:saved,slots:saved.slots,canDelete:true,error:null};}
  catch{return {profile:null,slots:Array.from({length:5},(_,index)=>loadErrorSlot(index+1)),canDelete:false,error:GENERIC_ERROR};}
 }
 return {profile:null,slots,canDelete:true,error:GENERIC_ERROR};
}

export function deleteUnreadableSlot(storage,slotId){
 if(!Number.isInteger(slotId)||slotId<1||slotId>5)throw new Error('삭제할 수 없는 슬롯입니다.');
 const raw=storage.getItem(STORAGE_KEY);let saved,envelope;
 try{saved=parseRaw(raw);envelope=validateGlobalEnvelope(saved);}catch{throw new Error('저장 기록을 확인할 수 없어 삭제할 수 없습니다.');}
 if(slotIsValid(envelope,saved.slots[slotId-1],slotId))throw new Error('손상된 슬롯이 아닙니다.');
 const replacement={...saved,slots:[...saved.slots]};
 replacement.slots[slotId-1]=emptySlot(slotId);
 const nextRaw=JSON.stringify(replacement);
 if(storage.getItem(STORAGE_KEY)!==raw)throw new Error('저장 데이터가 변경됐습니다. 다시 시도해 주세요.');
 storage.setItem(STORAGE_KEY,nextRaw);
 return replacement.slots[slotId-1];
}
