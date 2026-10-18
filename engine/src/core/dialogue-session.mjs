import {validateProfile,prepareEngineStateUpdate} from './storage.mjs';
const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const validChoices=value=>Array.isArray(value)&&value.every(choice=>isRecord(choice)&&typeof choice.choiceNodeId==='string'&&typeof choice.choiceId==='string');
const visibleKeys=['knowledge','expression','dexterity','exploration','magic'];
const validRevision=value=>typeof value==='string'&&!!value.trim()||Number.isSafeInteger(value)&&value>=0;
export function normalizeEngineStatKeys(value){
 if(!isRecord(value))throw new Error('스탯 정보를 확인할 수 없습니다.');
 const result={};for(const [key,amount] of Object.entries(value)){
  const normalized=key==='skill'?'dexterity':key==='caution'?'prudence':key;
  if(Object.hasOwn(result,normalized))throw new Error('같은 스탯의 중복된 이름을 받았습니다.');result[normalized]=amount;
 }return result;
}
export function prepareDialogueCompletion(profile,slotId,response,{run,eventId}){
 const live=profile?.slots?.[slotId-1];
 if(!run||live?.activeRun!==run||!isRecord(response)||response.success!==true||!['COMPLETE','SKIP'].includes(response.completionMode)||!validRevision(response.serverRevision)||!isRecord(response.activeRun))throw new Error('현재 회차의 대화 완료 결과를 확인할 수 없습니다.');
 const next=structuredClone(response.activeRun);
 if(next.runNumber!==run.runNumber||next.characterId!==run.characterId||next.week!==run.week||next.day!==run.day||next.phase!==run.phase)throw new Error('대화 결과가 현재 슬롯·회차·날짜와 일치하지 않습니다.');
 next.stats=normalizeEngineStatKeys(next.stats);if(next.hiddenStats)next.hiddenStats=normalizeEngineStatKeys(next.hiddenStats);
 for(const entry of [...(next.actionHistory??[]),...(next.mainStory?.history??[]),...(next.narrativeState?.history??[])])if(entry.effect?.growth)entry.effect.growth=normalizeEngineStatKeys(entry.effect.growth);
 for(const entry of run.actionHistory??[]){const saved=next.actionHistory?.find(item=>item.week===entry.week&&item.day===entry.day);if(JSON.stringify(saved)!==JSON.stringify(entry))throw new Error('대화 결과에서 기존 활동 기록이 달라졌습니다.');}
 if(/^MS0[1-6]$/.test(eventId)&&(!next.mainStory?.completedIds?.includes(eventId)||next.mainStory.pendingId===eventId))throw new Error('메인 이야기 완료 상태를 기다리고 있습니다.');
 if(next.pendingDialogue||next.narrativeState?.pending?.id===eventId||next.storyState?.pending?.eventId===eventId||next.pendingActivityStory||eventId==='MS01'&&next.flags?.admissionPending)throw new Error('이야기 완료 상태를 기다리고 있습니다.');
 const delta=normalizeEngineStatKeys(response.appliedSummary?.visibleStatDelta??{});
 if(Object.entries(delta).some(([key,value])=>!visibleKeys.includes(key)||!Number.isFinite(value)||value<0||value>500||next.stats[key]-run.stats[key]!==value))throw new Error('실제 적용된 성장 결과를 확인할 수 없습니다.');
 if(response.completionMode==='SKIP'&&(Object.values(delta).some(Boolean)||visibleKeys.some(key=>next.stats[key]!==run.stats[key])))throw new Error('건너뛰기에는 선택 보상을 적용할 수 없습니다.');
 const candidate=structuredClone(profile);candidate.slots[slotId-1].activeRun=next;candidate.slots[slotId-1].serverRevision=response.serverRevision;
 const received=prepareEngineStateUpdate(candidate,response);return {profile:received.profile,visibleStatDelta:delta,messages:received.messages};
}

// The provider owns HTTP/auth/content selection; this bridge owns only engine presentation and persistence.
export function createDialogueRuntime({services,getProfile,getSlotId,getUid=()=>null,setProfile,persist,render,onError,requestIdFactory}){
 let entry=null,generation=0;
 const start=async(eventId,onContinue)=>{
  if(entry?.live()&&entry.eventId===eventId)return false;
  if(entry?.session&&!entry.session.cancel())return false;
  const token=++generation,source=getProfile(),slotId=getSlotId(),uid=getUid(),run=source?.slots?.[slotId-1]?.activeRun;
  let prepared=null,applied=false,content=null,choices=[],completion=null;
  const live=()=>token===generation&&getProfile()===source&&getSlotId()===slotId&&getUid()===uid&&getProfile()?.slots?.[slotId-1]?.activeRun===run;
  const ensureLive=()=>{if(!live())throw new Error('이 대화의 계정 또는 회차가 변경되었습니다.');};
  const session=createDialogueSession({
   loadDialogue:typeof services.loadDialogue==='function'?async input=>{ensureLive();const value=await services.loadDialogue(input);ensureLive();return value;}:undefined,
   completeDialogue:typeof services.completeDialogue==='function'?async input=>{ensureLive();const value=await services.completeDialogue(input);ensureLive();return value;}:undefined,
   context:()=>({expectedServerRevision:source?.slots?.[slotId-1]?.serverRevision}),requestIdFactory,
   applyServerRun:async(_run,response)=>{
    ensureLive();if(!prepared){
     prepared=prepareDialogueCompletion(source,slotId,response,{run,eventId});
     const cache=structuredClone(run.dialogueHistory??[]);
     if(!cache.some(record=>record.eventId===eventId))cache.push({eventId,storyId:content.storyId,title:content.title??'완료한 이야기',week:run.week,day:/^MS0[1-6]$/.test(eventId)?0:Math.max(0,run.day-1),completionMode:response.completionMode,selectedChoices:structuredClone(choices),effect:{growth:prepared.visibleStatDelta}});
     prepared.profile.slots[slotId-1].activeRun.dialogueHistory=cache;
     validateProfile(prepared.profile);
    }
    await persist(prepared.profile,slotId);ensureLive();
    setProfile(prepared.profile);applied=true;
   },
   onRender:(payload,handlers)=>{ensureLive();content=payload;render(payload,{onComplete:value=>{choices=value?.selectedChoices??[];completion={mode:'COMPLETE',choices};return handlers.onComplete(value);},onSkip:value=>{choices=value?.selectedChoices??[];completion={mode:'SKIP',choices};return handlers.onSkip(value);}});},
   onContinue:(_run,response)=>{if(token!==generation||!applied||getProfile()!==prepared.profile||getSlotId()!==slotId||getUid()!==uid)return;entry=null;onContinue?.({...response,visibleStatDelta:prepared.visibleStatDelta,messages:prepared.messages});},
   onError:error=>{if(live())onError?.(error,()=>completion?session.finish(completion.mode,completion.choices):(entry=null,start(eventId,onContinue)));}
  });
  entry={session,eventId,live};return session.start({slotId:'slot-'+slotId,eventId});
 };
 return {start,cancel(){generation++;entry?.session.cancel();entry=null;},isActive:()=>!!entry?.live()};
}

export function createDialogueSession({loadDialogue,completeDialogue,context=()=>({}),applyServerRun,onRender=()=>{},onContinue=()=>{},onError=()=>{},requestIdFactory=()=>globalThis.crypto?.randomUUID?.()}){
 let generation=0,payload=null,completionInput=null,completionResult=null,loading=false,sending=false,active=false,finished=false;
 const report=error=>{try{onError(error instanceof Error?error:new Error(String(error)));}catch{}};
 const applyResult=async(token)=>{
  const response=completionResult;
  if(!isRecord(response)||response.success!==true||response.completionMode!==completionInput.completionMode||!isRecord(response.activeRun))throw new Error('대화 완료 응답에 확인 가능한 서버 회차 정보가 없습니다.');
  if(typeof applyServerRun!=='function')throw new Error('서버 회차를 저장할 엔진 연결을 기다리고 있습니다.');
  await applyServerRun(response.activeRun,response);
  if(token!==generation)return false;
  finished=true;active=false;onContinue(response.activeRun,response);return true;
 };
 const submit=async token=>{
  if(sending||!completionInput||token!==generation)return false;
  sending=true;
  try{
   if(!completionResult){
    if(typeof completeDialogue!=='function')throw new Error('대화 완료 서비스를 기다리고 있습니다.');
    completionResult=await completeDialogue(structuredClone(completionInput));
    if(token!==generation)return false;
   }
   return await applyResult(token);
  }catch(error){if(token===generation)report(error);return false;}
  finally{if(token===generation)sending=false;}
 };
 const finish=async(completionMode,selectedChoices=[])=>{
  if(!active||finished||loading||sending)return false;
  if(!['COMPLETE','SKIP'].includes(completionMode)||completionMode==='SKIP'&&payload.canSkip!==true||!validChoices(selectedChoices)){
   report(new Error('대화 완료 요청이 현재 payload와 일치하지 않습니다.'));return false;
  }
  if(!completionInput){
   let revision;
   try{revision=context()?.expectedServerRevision;}catch(error){report(error);return false;}
   if(!validRevision(revision)){report(new Error('서버 revision 정보를 기다리고 있습니다.'));return false;}
   const requestId=requestIdFactory?.();if(typeof requestId!=='string'||!requestId){report(new Error('완료 요청 ID를 만들 수 없습니다.'));return false;}
   completionInput={dialogueToken:payload.dialogueToken,completionMode,selectedChoices:structuredClone(selectedChoices),requestId,expectedServerRevision:revision};
  }
  return submit(generation);
 };
 const start=async({slotId,eventId}={})=>{
  if(sending||loading){report(new Error('현재 대화 요청이 끝날 때까지 기다려 주세요.'));return false;}
  const token=++generation;payload=null;completionInput=null;completionResult=null;finished=false;active=false;loading=false;sending=false;
  if(typeof loadDialogue!=='function'){report(new Error('대화 불러오기 서비스를 기다리고 있습니다.'));return false;}
  if(slotId===undefined||slotId===null||typeof eventId!=='string'||!eventId.trim()){report(new Error('현재 슬롯과 pending story event 연결을 기다리고 있습니다.'));return false;}
  loading=true;
  try{
   const loaded=await loadDialogue({slotId,eventId});
   if(token!==generation)return false;
   if(!isRecord(loaded)||loaded.schemaVersion!==1||typeof loaded.canSkip!=='boolean'||!isRecord(loaded.speakers)||loaded.eventId!==eventId||typeof loaded.dialogueToken!=='string'||!loaded.dialogueToken||!Array.isArray(loaded.sequence))throw new Error('대화 서비스 응답의 event 또는 payload 형식이 요청과 일치하지 않습니다.');
   payload=loaded;active=true;
   onRender(payload,{onComplete:value=>finish(value?.completionMode??'COMPLETE',value?.selectedChoices??[]),onSkip:value=>finish(value?.completionMode??'SKIP',value?.selectedChoices??[])});
   return true;
  }catch(error){if(token===generation){active=false;payload=null;report(error);}return false;}
  finally{if(token===generation)loading=false;}
 };
 return {start,finish,retry(){if(finished||!completionInput)return Promise.resolve(false);return submit(generation);},hasPendingCompletion(){return !finished&&!!completionInput;},cancel(){if(sending)return false;generation++;payload=null;completionInput=null;completionResult=null;loading=false;active=false;finished=false;return true;}};
}
