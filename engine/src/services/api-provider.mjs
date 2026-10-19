const RETRYABLE_STATUS=new Set([408,425,429,500,502,503,504]);
export const PRIVACY_CONSENT_VERSION='2026-10-15';

export class LumiaApiError extends Error{
 constructor(message,{code='SERVICE_ERROR',status=0,retryable=false}={}){
  super(message);this.name='LumiaApiError';this.code=code;this.status=status;this.retryable=retryable;
 }
}

const errorCode=status=>status===401?'AUTH_REQUIRED':status===403?'FORBIDDEN':status===404?'NOT_FOUND':status===409?'CONFLICT':status===422?'VALIDATION':status>=500?'SERVICE_UNAVAILABLE':'SERVICE_ERROR';
const safeDetail=value=>{
 const detail=typeof value==='string'?value:value?.detail;
 return typeof detail==='string'&&detail.trim()?detail.trim().slice(0,240):null;
};
const clone=value=>value===undefined?undefined:structuredClone(value);
const slotIdOf=value=>{if(!Number.isInteger(value)||value<1||value>5)throw new LumiaApiError('저장 슬롯 번호가 올바르지 않습니다.',{code:'VALIDATION'});return value;};
const requestIdBody=(body,{revision=true}={})=>{
 if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.requestId!=='string'||!body.requestId.trim())throw new LumiaApiError('변경 요청에는 requestId가 필요합니다.',{code:'VALIDATION'});
 if(revision&&(!Number.isInteger(body.expectedServerRevision)||body.expectedServerRevision<0))throw new LumiaApiError('변경 요청에는 서버 revision이 필요합니다.',{code:'VALIDATION'});
 return clone(body);
};

export function createLumiaApiProvider({baseUrl,getIdToken,fetchImpl=globalThis.fetch,timeoutMs=10000,endingTimeoutMs=35000,maxAttempts=2}={}){
 if(typeof baseUrl!=='string'||!baseUrl.trim())throw new Error('LUMIA API base URL이 필요합니다.');
 if(typeof getIdToken!=='function')throw new Error('Firebase ID Token provider가 필요합니다.');
 if(typeof fetchImpl!=='function')throw new Error('fetch 구현이 필요합니다.');
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0||!Number.isFinite(endingTimeoutMs)||endingTimeoutMs<timeoutMs||!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3)throw new Error('API timeout/retry 설정이 올바르지 않습니다.');
 const root=baseUrl.replace(/\/+$/,'');
 const request=async(path,{method='GET',body,retryable=method==='GET',retryStatuses=RETRYABLE_STATUS,requestTimeoutMs=timeoutMs}={})=>{
  const bodyText=body===undefined?undefined:JSON.stringify(body);
  let lastError,attempt=1,forceRefresh=false,authRetried=false;
  while(attempt<=maxAttempts){
   let token,tokenTimer;
   try{
    token=await Promise.race([
     Promise.resolve().then(()=>getIdToken({forceRefresh})),
     new Promise((_,reject)=>{tokenTimer=setTimeout(()=>reject(new LumiaApiError('로그인 인증 확인 시간이 초과되었습니다.',{code:'TIMEOUT',retryable:true})),requestTimeoutMs);}),
    ]);
    forceRefresh=false;
   }catch(error){
    if(error instanceof LumiaApiError)throw error;
    throw new LumiaApiError('로그인 인증 정보를 확인하지 못했습니다.',{code:'AUTH_REQUIRED'});
   }finally{clearTimeout(tokenTimer);}
   if(typeof token!=='string'||!token.trim())throw new LumiaApiError('로그인 인증 정보가 없습니다.',{code:'AUTH_REQUIRED'});
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),requestTimeoutMs);
   try{
    const response=await fetchImpl(root+path,{method,headers:{Authorization:`Bearer ${token}`,...(bodyText===undefined?{}:{'Content-Type':'application/json'})},body:bodyText,signal:controller.signal});
    let data=null;try{data=await response.json();}catch{}
    if(response.ok)return data;
    if(response.status===401&&!authRetried){authRetried=true;forceRefresh=true;continue;}
    const canRetry=retryable&&retryStatuses.has(response.status)&&attempt<maxAttempts;
    const error=new LumiaApiError(safeDetail(data)??`API 요청에 실패했습니다. (${response.status})`,{code:errorCode(response.status),status:response.status,retryable:canRetry||RETRYABLE_STATUS.has(response.status)});
    if(canRetry){lastError=error;attempt++;continue;}throw error;
   }catch(error){
    if(error instanceof LumiaApiError)throw error;
    const timeout=error?.name==='AbortError',canRetry=retryable&&attempt<maxAttempts;
    const mapped=new LumiaApiError(timeout?'API 응답 시간이 초과되었습니다.':'API에 연결하지 못했습니다.',{code:timeout?'TIMEOUT':'NETWORK',retryable:true});
    if(canRetry){lastError=mapped;attempt++;continue;}throw mapped;
   }finally{clearTimeout(timer);}
  }
  throw lastError??new LumiaApiError('API 요청을 완료하지 못했습니다.');
 };
 const slotPath=id=>`/v1/save-slots/${slotIdOf(id)}`;
 const mutation=(path,body,method='POST',requestTimeoutMs=timeoutMs)=>request(path,{method,body:requestIdBody(body),retryable:true,requestTimeoutMs});
 return {
  bootstrapAccount:({privacyConsentAccepted,privacyConsentVersion}={})=>{
   if(privacyConsentAccepted!==true||privacyConsentVersion!==PRIVACY_CONSENT_VERSION)throw new LumiaApiError('현재 개인정보 수집·이용 동의가 필요합니다.',{code:'VALIDATION'});
   return request('/v1/account/bootstrap',{method:'POST',body:{privacyConsentAccepted:true,privacyConsentVersion},retryable:true});
  },
  updateAccountSettings:body=>{
   if(!body||typeof body!=='object'||Array.isArray(body)||!Object.keys(body).length)throw new LumiaApiError('변경할 계정 설정이 필요합니다.',{code:'VALIDATION'});
   return request('/v1/account/settings',{method:'PATCH',body:clone(body),retryable:true});
  },
  listSaveSlots:()=>request('/v1/save-slots'),
  getSaveSlot:slotId=>request(slotPath(slotId)),
  startRun:(slotId,body)=>mutation(`${slotPath(slotId)}/runs`,body),
  deleteSaveSlot:(slotId,body)=>mutation(slotPath(slotId),body,'DELETE'),
	deleteUnreadableSaveSlot:(slotId,body)=>request(slotPath(slotId),{method:'DELETE',body:requestIdBody(body,{revision:false}),retryable:true}),
  recoverSaveSlot:(slotId,body)=>mutation(`${slotPath(slotId)}/recover`,body),
  confirmSchedule:(slotId,body)=>mutation(`${slotPath(slotId)}/schedule`,body),
  startActivity:(slotId,body)=>mutation(`${slotPath(slotId)}/activities/start`,body),
  completeSpecial:(slotId,body)=>mutation(`${slotPath(slotId)}/activities/complete-special`,body),
  completeClassQuit:(slotId,body)=>mutation(`${slotPath(slotId)}/activities/complete-class-quit`,body),
  completeClassReplay:(slotId,body)=>mutation(`${slotPath(slotId)}/activities/complete-class-replay`,body),
  completeForcedRest:(slotId,body)=>mutation(`${slotPath(slotId)}/activities/complete-forced-rest`,body),
  completeRest:(slotId,body)=>mutation(`${slotPath(slotId)}/activities/complete-rest`,body),
  completeAdventure:(slotId,body)=>mutation(`${slotPath(slotId)}/activities/complete-adventure`,body),
  closeWeek:(slotId,body)=>mutation(`${slotPath(slotId)}/weeks/close`,body),
  acknowledgeWeekSummary:(slotId,body)=>mutation(`${slotPath(slotId)}/weeks/ack-summary`,body),
  loadDialogue:async({slotId,eventId})=>{
   const payload=await request(`${slotPath(slotId)}/dialogue/${encodeURIComponent(eventId)}`,{retryStatuses:new Set()}),assetUrl=value=>typeof value==='string'&&value.startsWith('/')?new URL(value,root+'/').href:value;
   if(payload?.speakers&&typeof payload.speakers==='object')for(const speaker of Object.values(payload.speakers))if(speaker&&typeof speaker==='object')speaker.portraitSrc=assetUrl(speaker.portraitSrc);
   if(Array.isArray(payload?.sequence))for(const entry of payload.sequence)if(entry?.type==='IMAGE')entry.src=assetUrl(entry.src);
   return payload;
  },
  completeDialogue:body=>mutation('/v1/dialogue/complete',body),
  getCollection:()=>request('/v1/collection'),
  openMyRoom:(slotId,body)=>mutation(`${slotPath(slotId)}/my-room/open`,body),
  decideEnding:(slotId,body)=>mutation(`${slotPath(slotId)}/ending/decision`,body),
  prepareEnding:(slotId,body)=>request(`${slotPath(slotId)}/ending/prepare`,{method:'POST',body:requestIdBody(body),retryable:false,requestTimeoutMs:endingTimeoutMs}),
  getEnding:slotId=>request(`${slotPath(slotId)}/ending`),
  finishEnding:(slotId,body)=>mutation(`${slotPath(slotId)}/ending/finish`,body),
  getEndingRecord:recordId=>request(`/v1/ending-records/${encodeURIComponent(recordId)}`),
  listEndingRecords:()=>request('/v1/ending-records'),
  getPetDialogues:petId=>request(`/v1/pets/${encodeURIComponent(petId)}/dialogues`),
 };
}

export function installLumiaApiProvider(options,target=globalThis){
 const provider=createLumiaApiProvider(options);
 target.lumiaEngineServices={...(target.lumiaEngineServices??{}),...provider};
 return target.lumiaEngineServices;
}
