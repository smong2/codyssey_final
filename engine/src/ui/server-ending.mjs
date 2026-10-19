import {serverEndingDecision,serverEndingUnlockSummary,validateServerPreparedEnding} from '../core/server-ending.mjs';
import {createEndingJourney} from './ending-journey.mjs';

export function createServerEndingUI({el,btn,shell,heading,current,slotId,game,services,mutate,onTitle=()=>{},onWelcome}){
 let prepared=null;
 const submit=(service,id,work)=>{
  const pending=game.pending?.();if(!pending)return work();
  if(pending.service!==service||pending.slotId!==id)throw new Error('진행 중인 저장을 먼저 확인해 주세요.');
  return game.retry();
 };
 const journey=createEndingJourney({el,btn,shell,heading,current,onTitle,onWelcome,
  async onPrepare({ready,active}){
   const key={slotId:slotId(),runId:current()?.runId};
   const sameRun=()=>active()&&slotId()===key.slotId&&current()?.runId===key.runId;
   const accept=value=>{if(!sameRun())return;prepared=validateServerPreparedEnding(value,key);ready({careerName:prepared.ending.name,subtitle:prepared.ending.subtitle,content:prepared.letter.content,source:prepared.letter.generationStatus==='FALLBACK'?'fallback':'ai'});};
   if(prepared){accept(prepared);return true;}
   if(current()?.serverPhase==='ENDING_READY'){accept(await services.getEnding(key.slotId));return true;}
   const prepare=async()=>{
    if(!sameRun())return false;
    try{
     serverEndingDecision(current());
     return await mutate(()=>submit('prepareEnding',key.slotId,()=>game.prepareEnding(key.slotId)),response=>accept(response?.result));
    }catch{return false;}
   };
   if(current()?.serverPhase==='ENDING_PENDING'){
    let next;
    const ok=await mutate(()=>submit('decideEnding',key.slotId,()=>game.decideEnding(key.slotId)),()=>{next=prepare();});
    return ok?await next:false;
   }
   return prepare();
  },
  onFinish({ready,active}){
   if(!prepared)return false;
   return mutate(()=>submit('finishEnding',slotId(),()=>game.finishEnding(slotId(),prepared.recordId)),response=>{if(active())ready(serverEndingUnlockSummary(response));});
  }
 });
 return {render(){
  const run=current();if(!['ENDING_PENDING','ENDING_DECIDED','ENDING_READY'].includes(run?.serverPhase))throw new Error('현재 서버 회차는 엔딩 단계가 아닙니다.');
  prepared=null;journey.render({resume:run.serverPhase!=='ENDING_PENDING'});
 }};
}
