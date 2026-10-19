import {createDialogueSession} from './dialogue-session.mjs';
import {applyServerActiveRun,applyServerCollection,applyServerCollectionPatch,applyServerSlot,createServerProfile,projectServerSlot} from './server-state.mjs';
import {acceptCollectionChanges} from './collection-notices.mjs';

const clone=value=>value===undefined?undefined:structuredClone(value);
const required=['bootstrapAccount','listSaveSlots','getSaveSlot','getCollection'];
const defaultId=()=>globalThis.crypto?.randomUUID?.();

export function createServerGameSession({services,requestIdFactory=defaultId,onChange=()=>{},onCollectionChanges=()=>{}}={}){
 if(!services||required.some(name=>typeof services[name]!=='function'))throw new Error('서버 저장 provider가 준비되지 않았습니다.');
 let profile=null,pendingMutation=null;
 const emit=()=>{onChange(profile);return profile;};
 const requestId=()=>{const id=requestIdFactory?.();if(typeof id!=='string'||!id)throw new Error('서버 변경 요청 ID를 만들 수 없습니다.');return id;};
 const slot=id=>{const value=profile?.slots?.find(item=>item.slotId===id);if(!value)throw new Error('서버 저장 슬롯을 먼저 불러와 주세요.');return value;};
 const refreshCollection=async()=>{if(typeof services.getCollection!=='function')return;const previous=clone(profile.meta);applyServerCollection(profile,await services.getCollection());onCollectionChanges(acceptCollectionChanges(previous,profile.meta));};
 const applyCollectionPatch=patch=>{if(!patch)return false;const previous=clone(profile.meta);applyServerCollectionPatch(profile,patch);onCollectionChanges(acceptCollectionChanges(previous,profile.meta));return true;};
 const refreshSlot=async(slotId,{collection=true}={})=>{
  const [received,collectionValue]=await Promise.all([services.getSaveSlot(slotId),collection&&typeof services.getCollection==='function'?services.getCollection():null]);
  const projected=projectServerSlot(received),index=profile.slots.findIndex(item=>item.slotId===slotId);if(index<0)throw new Error('새로 받은 서버 슬롯을 적용할 수 없습니다.');profile.slots[index]=projected;
  if(collectionValue){const previous=clone(profile.meta);applyServerCollection(profile,collectionValue);onCollectionChanges(acceptCollectionChanges(previous,profile.meta));}
  emit();return projected;
 };
 const submit=async()=>{
  if(!pendingMutation)return false;const job=pendingMutation,fn=services[job.service];if(typeof fn!=='function')throw new Error(`서버 ${job.service} provider가 준비되지 않았습니다.`);
  const result=await fn(job.slotId,clone(job.input));
  if(result?.slot){
   const projected=applyServerSlot(profile,result.slot);if(projected.slotId!==job.slotId)throw new Error('서버 저장 슬롯 응답이 현재 요청과 다릅니다.');
   if(result.collectionPatch)applyCollectionPatch(result.collectionPatch);else if(job.refresh==='full')await refreshCollection();
   emit();
  }else if(job.refresh==='revision'){
   if(!Number.isInteger(result?.serverRevision)||result.serverRevision<0)throw new Error('서버 저장 revision 응답이 올바르지 않습니다.');slot(job.slotId).serverRevision=result.serverRevision;emit();
  }else await refreshSlot(job.slotId,{collection:job.refresh!=='slot'});
  pendingMutation=null;return {result:clone(result),slot:clone(slot(job.slotId))};
 };
 const mutate=async(service,slotId,command={},refresh='full')=>{
  if(pendingMutation)throw new Error('실패한 서버 저장 요청을 먼저 다시 시도해 주세요.');
  const current=slot(slotId);if(!Number.isInteger(current.serverRevision))throw new Error('현재 슬롯의 서버 revision이 없습니다.');
  pendingMutation={service,slotId,refresh,input:{...clone(command),requestId:requestId(),expectedServerRevision:current.serverRevision}};return submit();
 };
	const deleteUnreadable=async slotId=>{
		if(pendingMutation)throw new Error('실패한 서버 저장 요청을 먼저 다시 시도해 주세요.');
		const current=slot(slotId);if(current.status!=='LOAD_ERROR')throw new Error('문제가 있는 저장 슬롯만 이 방식으로 삭제할 수 있습니다.');
		pendingMutation={service:'deleteUnreadableSaveSlot',slotId,refresh:'slot',input:{confirm:true,resetUnreadable:true,requestId:requestId()}};return submit();
	};
 const load=async()=>{const [listed,collection]=await Promise.all([services.listSaveSlots(),services.getCollection()]);profile=createServerProfile(listed?.slots,collection);pendingMutation=null;return emit();};
 return {
  load,
  async bootstrap(consent){await services.bootstrapAccount(clone(consent));return load();},
  profile:()=>profile,
  slot:id=>slot(id),
  currentRevision:id=>slot(id).serverRevision,
  pending:()=>clone(pendingMutation),
  retry(){return submit();},
  async resolveConflict(){
   if(!pendingMutation)return false;
   const slotId=pendingMutation.slotId;pendingMutation=null;return refreshSlot(slotId);
  },
  refreshSlot,
  async updateSettings(command){
   if(pendingMutation)throw new Error('실패한 서버 저장 요청을 먼저 다시 시도해 주세요.');
   if(typeof services.updateAccountSettings!=='function')throw new Error('계정 설정 provider가 준비되지 않았습니다.');
   const result=await services.updateAccountSettings(clone(command));applyCollectionPatch({settings:result});emit();return clone(result);
  },
  startRun:(slotId,characterId)=>mutate('startRun',slotId,{characterId},'slot'),
  deleteSaveSlot:slotId=>mutate('deleteSaveSlot',slotId,{confirm:true},'slot'),
	deleteUnreadableSaveSlot:deleteUnreadable,
  recoverSaveSlot:slotId=>mutate('recoverSaveSlot',slotId,{},'slot'),
  confirmSchedule:(slotId,activityIds)=>mutate('confirmSchedule',slotId,{activityIds:clone(activityIds)},'revision'),
  startActivity:slotId=>mutate('startActivity',slotId,{},'slot'),
  completeSpecial:(slotId,command)=>mutate('completeSpecial',slotId,command,'slot'),
  completeClassQuit:slotId=>mutate('completeClassQuit',slotId),
  completeClassReplay:(slotId,inputLog)=>mutate('completeClassReplay',slotId,{inputLog:clone(inputLog)}),
  completeForcedRest:slotId=>mutate('completeForcedRest',slotId,{},'slot'),
  completeRest:(slotId,command={})=>mutate('completeRest',slotId,command),
  completeAdventure:(slotId,command)=>mutate('completeAdventure',slotId,command),
  closeWeek:slotId=>mutate('closeWeek',slotId,{},'slot'),
  acknowledgeWeekSummary:slotId=>mutate('acknowledgeWeekSummary',slotId,{},'slot'),
  openMyRoom:slotId=>mutate('openMyRoom',slotId),
  decideEnding:slotId=>mutate('decideEnding',slotId,{},'slot'),
  prepareEnding:slotId=>mutate('prepareEnding',slotId,{},'revision'),
  finishEnding:(slotId,recordId)=>mutate('finishEnding',slotId,{recordId}),
  async applyDialogueResult(slotId,activeRun,response){
   if(!profile)throw new Error('서버 저장 슬롯을 먼저 불러와 주세요.');
   if(response?.slot)applyServerSlot(profile,response.slot);else applyServerActiveRun(profile,slotId,activeRun,response?.serverRevision);
   if(response?.collectionPatch)applyCollectionPatch(response.collectionPatch);else await refreshCollection();emit();return slot(slotId).activeRun;
  }
 };
}

export function createServerDialogueSession({game,services,slotId,onRender,onContinue=()=>{},onError=()=>{},requestIdFactory=defaultId}){
 if(!game||typeof game.currentRevision!=='function'||typeof game.applyDialogueResult!=='function')throw new Error('서버 게임 세션이 필요합니다.');
 if(typeof slotId!=='function')throw new Error('대화 저장 슬롯 provider가 필요합니다.');
 let activeSlotId=null,lastInput=null;
 const session=createDialogueSession({
  loadDialogue:services?.loadDialogue,completeDialogue:services?.completeDialogue,
  context:()=>({expectedServerRevision:game.currentRevision(activeSlotId)}),
  applyServerRun:(activeRun,response)=>game.applyDialogueResult(activeSlotId,activeRun,response),
  onRender:(payload,handlers)=>{if(activeSlotId===slotId())onRender?.(payload,handlers);},
  onContinue:(run,response)=>{if(activeSlotId===slotId())onContinue(run,response);},
  onError:error=>{if(activeSlotId===slotId())onError(error,()=>session.hasPendingCompletion()?session.retry():session.start(lastInput));},
  requestIdFactory,
 });
 return {
  start(input={}){
   if(session.hasPendingCompletion())return false;
   if(!Number.isInteger(input.slotId)||input.slotId<1||input.slotId>5)throw new Error('대화 슬롯 번호가 올바르지 않습니다.');
   activeSlotId=input.slotId;lastInput=clone(input);
   return session.start(input);
  },
  cancel(){const cancelled=session.cancel();if(cancelled){activeSlotId=null;lastInput=null;}return cancelled;},
  hasPendingCompletion:()=>session.hasPendingCompletion(),
 };
}
