export function createSlotRecoveryUI({el,btn,modal,onRetry=()=>{},onDelete=()=>{}}){
 function card(slotId,{canDelete=true}={}){
  const root=el('article',null,'slot-card slot-card-error');
  root.append(el('h2',`슬롯 ${slotId}`),el('p','저장 기록을 확인할 수 없습니다.'));
  const actions=el('div',null,'slot-card-actions');
  const retryState={busy:false,error:null};
  const retry=btn('다시 시도',()=>{void retryInspection(slotId,root,retry,retryState);},'primary-button');actions.append(retry);
  if(canDelete)actions.append(btn('삭제',()=>confirmDelete(slotId),'danger-button'));
  root.append(actions);return root;
 }
 async function retryInspection(slotId,root,button,state){
  if(state.busy)return;state.busy=true;button.disabled=true;
  try{await onRetry(slotId);}
  catch(error){
   const message=`저장 기록을 다시 확인하지 못했습니다: ${error?.message??'다시 시도해 주세요.'}`;
   if(state.error)state.error.textContent=message;else{state.error=el('p',message,'slot-recovery-error');root.append(state.error);}
  }finally{state.busy=false;button.disabled=false;}
 }
 function confirmDelete(slotId){
  const body=el('div',null,'slot-recovery-confirmation');
  body.append(el('p','현재 이 슬롯의 저장 기록을 정상적으로 확인할 수 없습니다.'),
   el('p','삭제한 슬롯 기록은 복구할 수 없습니다.'),
   el('p','배지·캐릭터·펫·엔딩 등 계정 전체 진행은 유지됩니다.'));
  let busy=false;
  let dialog;
  let errorMessage=null,retryDelete=null,reload=null;
  const cancel=btn('취소',()=>dialog?.close?.(),'text-button');
  const confirm=btn('삭제',()=>remove(),'danger-button'),buttons=[cancel,confirm];
  async function remove(){
   if(busy)return;busy=true;confirm.disabled=true;cancel.disabled=true;
   if(retryDelete)retryDelete.disabled=true;if(reload)reload.disabled=true;
   try{await onDelete(slotId);dialog?.close?.();}
   catch(error){
    const message=`삭제하지 못했습니다: ${error?.message??'다시 시도해 주세요.'}`;
    if(errorMessage)errorMessage.textContent=message;else{errorMessage=el('p',message,'slot-recovery-error');body.append(errorMessage);}
    if(!retryDelete){
     retryDelete=btn('다시 시도',()=>remove(),'primary-button');reload=btn('저장 다시 확인',()=>onRetry(slotId),'text-button');
     buttons.push(retryDelete,reload);dialog?.querySelector?.('.actions')?.append(retryDelete,reload);
    }
   }finally{
    busy=false;confirm.disabled=false;cancel.disabled=false;
    if(retryDelete)retryDelete.disabled=false;if(reload)reload.disabled=false;
   }
  }
  dialog=modal('이 저장 기록을 삭제할까요?',body,buttons);
  return dialog;
 }
 return {card};
}
