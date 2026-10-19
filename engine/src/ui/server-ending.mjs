import {serverEndingDecision,serverEndingUnlockSummary,validateServerPreparedEnding} from '../core/server-ending.mjs';

export function createServerEndingUI({el,btn,shell,heading,current,slotId,game,services,mutate,onTitle=()=>{},character=()=>null}){
 let generation=0,stage=0,prepared=null,finishResult=null,busy=false,error='',runNumber=null;
 const live=id=>id===generation&&shell.classList.contains('ending-page');
 const setError=value=>{error=value?.message??String(value??'엔딩을 불러오지 못했습니다.');};
 const summary=(run)=>{
  const panel=el('aside',null,'paper ending-summary'),person=prepared?.character??character()??{name:'학생'};
  panel.append(shell.querySelector('h1'),el('h2',person.name),el('p',(run?.runNumber??runNumber??'')+'회차 · 52주차'));
  if(prepared?.playRecords?.length){panel.append(el('h3','아르카디아에서의 기록'));for(const record of prepared.playRecords)panel.append(el('p',`${record.label} · ${record.count}회`));}
  return panel;
 };
 function paint(){
  const id=++generation,run=current();heading('아르카디아에서 그려 본 미래','ending-page');
  const layout=el('div',null,'ending-layout ending-career-art'),side=summary(run),letter=el('article',null,'paper ending-letter');
  if(stage===0){
   letter.append(el('p','최종 질문','ending-label'),el('h2','무엇을 지켰니?'),el('p','이 질문은 정답을 요구하지 않습니다.','ending-placeholder'));
   const next=btn('계속',async()=>{if(busy)return;if(run?.serverPhase!=='ENDING_PENDING'){stage=1;paint();return;}busy=true;next.disabled=true;const ok=await mutate(()=>game.decideEnding(slotId()),()=>{stage=1;busy=false;paint();});if(!ok){busy=false;next.disabled=false;}} ,'ending-continue');shell.append(layout);layout.append(side,letter);shell.append(next);return;
  }
  if(stage===1){
   let decision;try{decision=serverEndingDecision(run);}catch(e){setError(e);}
   letter.append(el('p','너의 미래는','ending-label'),el('h2',decision?.title??'미래 결과를 확인하지 못했습니다.'));
   if(decision?.subtitle)letter.append(el('p','《'+decision.subtitle+'》','ending-placeholder'));
   if(error)letter.append(el('small',error));
   const next=btn('편지 보기',async()=>{if(busy)return;if(prepared){stage=2;paint();return;}busy=true;next.disabled=true;const ok=await mutate(()=>game.prepareEnding(slotId()),result=>{try{prepared=validateServerPreparedEnding(result?.result,{slotId:slotId(),runId:run.runId});stage=2;error='';busy=false;paint();}catch(e){setError(e);busy=false;paint();}});if(!ok){busy=false;next.disabled=false;}} ,'ending-continue');
   next.disabled=!decision||busy;
   layout.append(side,letter);shell.append(layout,next);return;
  }
  if(stage===2){
   letter.append(el('p','엔딩 편지','ending-label'),el('h2',(prepared?.character?.name??character()?.name??'학생')+'에게'));
   if(prepared?.ending?.subtitle)letter.append(el('p','《'+prepared.ending.subtitle+'》','ending-placeholder'));
   if(prepared?.letter?.content)letter.append(el('p',prepared.letter.content,'ending-letter-content'));else letter.append(el('p',error||'편지를 불러오지 못했습니다.','ending-placeholder'));
   if(prepared?.representativeChoices?.length){const choices=el('section');choices.append(el('h3','기억에 남은 선택'));for(const choice of prepared.representativeChoices)choices.append(el('p',choice.summary));letter.append(choices);}
   const final=btn('엔딩 마치기',async()=>{if(busy||!prepared)return;busy=true;final.disabled=true;const ok=await mutate(()=>game.finishEnding(slotId(),prepared.recordId),result=>{finishResult=result;busy=false;const unlocks=serverEndingUnlockSummary(result);if(unlocks.length){stage=3;paint();}else onTitle();});if(!ok){busy=false;final.disabled=false;}} ,'ending-continue');final.disabled=!prepared||busy;
   layout.append(side,letter);shell.append(layout,final);return;
  }
  const unlocks=serverEndingUnlockSummary(finishResult),groups=new Map();letter.append(el('h2','이번 여행으로 새롭게 열린 것'));
  for(const item of unlocks)groups.set(item.label,(groups.get(item.label)??0)+1);
  for(const [label,count] of groups)letter.append(el('p',`${label} · ${count}`));
  layout.append(side,letter);shell.append(layout,btn('타이틀로',onTitle,'ending-continue'));
  void id;
 }
 async function loadReady(run){
  const id=++generation;busy=true;heading('아르카디아에서 온 편지 확인 중','ending-page');shell.append(el('p','저장된 엔딩 편지를 확인하고 있습니다.','ending-placeholder'));
  try{const value=await services.getEnding(slotId());if(!live(id))return false;prepared=validateServerPreparedEnding(value,{slotId:slotId(),runId:run.runId});stage=0;busy=false;error='';paint();return true;}
  catch(e){if(!live(id))return false;busy=false;setError(e);heading('엔딩 편지를 불러오지 못했습니다.','ending-page');const body=el('section',null,'paper ending-letter');body.append(el('p',error,'ending-placeholder'),btn('다시 불러오기',()=>loadReady(current())));shell.append(body);return false;}
 }
 function render(){
  const run=current();if(!run)throw new Error('진행 중인 서버 회차가 없습니다.');runNumber=run.runNumber;finishResult=null;error='';
  if(run.serverPhase==='ENDING_READY'){stage=0;prepared=null;loadReady(run);return;}
  if(run.serverPhase==='ENDING_DECIDED'){stage=1;prepared=null;paint();return;}
  if(run.serverPhase==='ENDING_PENDING'){stage=0;prepared=null;paint();return;}
  throw new Error('현재 서버 회차는 엔딩 단계가 아닙니다.');
 }
 return {render};
}
