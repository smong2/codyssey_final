const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const validChoices=value=>Array.isArray(value)&&value.every(choice=>isRecord(choice)&&typeof choice.choiceNodeId==='string'&&typeof choice.choiceId==='string');

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
   if(revision===undefined||revision===null){report(new Error('서버 revision 정보를 기다리고 있습니다.'));return false;}
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
   if(!isRecord(loaded)||loaded.eventId!==eventId||typeof loaded.dialogueToken!=='string'||!loaded.dialogueToken||!Array.isArray(loaded.sequence))throw new Error('대화 서비스 응답의 event 또는 payload 형식이 요청과 일치하지 않습니다.');
   payload=loaded;active=true;
   onRender(payload,{onComplete:value=>finish(value?.completionMode??'COMPLETE',value?.selectedChoices??[]),onSkip:value=>finish(value?.completionMode??'SKIP',value?.selectedChoices??[])});
   return true;
  }catch(error){if(token===generation){active=false;payload=null;report(error);}return false;}
  finally{if(token===generation)loading=false;}
 };
 return {start,finish,retry(){if(finished||!completionInput)return Promise.resolve(false);return submit(generation);},hasPendingCompletion(){return !finished&&!!completionInput;},cancel(){if(sending)return false;generation++;payload=null;completionInput=null;completionResult=null;loading=false;active=false;finished=false;return true;}};
}
