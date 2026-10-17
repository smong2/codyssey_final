import {STORAGE_KEY} from './storage.mjs';

// Development-only namespace. Authentication and server saves remain provider-owned.
export function createAccountStorage(storage,uid){
 if(typeof uid!=='string'||!uid.trim())throw new Error('인증된 계정 식별 정보가 필요합니다.');
 const scopedKey=STORAGE_KEY+':account:'+encodeURIComponent(uid);
 const check=key=>{if(key!==STORAGE_KEY)throw new Error('지원하지 않는 개발 저장 키입니다.');};
 return {getItem(key){check(key);return storage.getItem(scopedKey);},setItem(key,value){check(key);storage.setItem(scopedKey,value);}};
}

export function ownsActivityEvent(event,{slotId,activityToken,uid=null}){
 return event?.activityToken===activityToken&&(uid===null?event.uid===undefined&&(event.slotId===undefined||event.slotId===slotId):event.uid===uid&&event.slotId===slotId);
}
export function selectActivityEvent(events,context){
 if(!Array.isArray(events))return null;
 const matches=events.filter(event=>ownsActivityEvent(event,context));
 // Older injected events were implicitly current-slot scoped; keep unique ones only.
 return matches.length===1?matches[0]:null;
}
