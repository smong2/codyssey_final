import {endingSnapshot,validateEndingView,exampleEnding,displayedEndingRecords,ENDING_RECORD_LABELS} from '../core/ending-frame.mjs';
import {ENDING_SUBTITLES} from '../core/ending-system.mjs';
import {createCloseButton} from './button-art.mjs';

export function createEndingUI({el,btn,shell,heading,current,character,slotId,onReturn,onComplete=()=>{},loadEnding=null,onReceive=()=>false,isSaveFailed=()=>false}){
 let generation=0;
 function render({example=false,response=null,error='',loading=false}={}){
  const id=++generation,run=current(),snapshot=endingSnapshot(run,character());
  if(arguments[0]?.actual){
   const record=run.endingRecord,key={slotId:slotId(),runNumber:run.runNumber};let stage=0,loading=false,error=false,received=null;
   const live=active=>active===generation&&current()===run&&shell.classList.contains('ending-page');
   const fetchLetter=async()=>{
    if(loading||!loadEnding&&!received)return;loading=true;error=false;paint();const active=generation;
    try{const value=received??validateEndingView(await loadEnding(key),key);if(!live(active))return;
     received=value;if(!onReceive(value))throw new Error('save');received=null;loading=false;paint();
    }catch{if(!live(active))return;loading=false;error=true;paint();}
   };
   const paint=()=>{
    const active=++generation;heading('아르카디아에서 그려 본 미래','ending-page');
    const layout=el('div',null,'ending-layout ending-career-art'),summary=el('aside',null,'paper ending-summary'),letter=el('article',null,'paper ending-letter');
    summary.append(shell.querySelector('h1'),el('h2',snapshot.character.name),el('p',snapshot.runNumber+'회차 · 52주차'));
    if(stage===0){letter.append(el('p','최종 질문','ending-label'),el('h2','무엇을 지켰니?'),el('p','이 질문은 정답을 요구하지 않습니다.','ending-placeholder'));}
    else if(stage===1){letter.append(el('p','너의 미래는','ending-label'),el('h2',record?.careerName??'진로 결과 준비 대기'));
     const subtitle=ENDING_SUBTITLES[record?.careerId];if(subtitle)letter.append(el('p','《'+subtitle+'》','ending-placeholder'));
    }else if(stage===2){
     letter.append(el('p','엔딩 편지','ending-label'),el('h2',snapshot.character.name+'에게'));
     summary.append(el('h3','아르카디아에서의 기록'));const rows=displayedEndingRecords(record);for(const metric of rows)summary.append(el('p',ENDING_RECORD_LABELS[metric.key]+' · '+metric.value+'회'));
     if(!record.playRecords)summary.append(el('small','현재 회차에서 확인되는 기록입니다. 최종 기록 선별 연결 대기.'));
     if(record?.letter?.status==='ready'){letter.append(el('small',record.letter.source==='ai'?'AI가 작성한 개인화 편지':'아르카디아의 기본 편지'));for(const [title,key]of [['이번 이야기의 미래','future'],['이야기 돌아보기','reflection'],['미래 모습과 응원','encouragement']]){const section=el('section');section.append(el('h3',title),el('p',record.letter.sections[key]));letter.append(section);}}
     else letter.append(el('p',error?'편지를 불러오지 못했습니다.':loading?'아르카디아에서 온 편지를 준비하고 있어요...':loadEnding?'아르카디아에서 온 편지를 준비하고 있어요...':'편지 연결을 기다리고 있어요.','ending-placeholder'));
     if((record?.letter?.status!=='ready'||isSaveFailed())&&(loadEnding||received)){const retry=btn(isSaveFailed()?'저장 다시 시도':'다시 시도',fetchLetter);retry.disabled=loading;letter.append(retry);}
    }else{letter.append(el('h2','이번 여행으로 새롭게 열린 것'));for(const [kind,label]of [['character','새로운 캐릭터'],['pet','새로운 펫'],['badge','배지'],['background','마이룸 배경']]){const count=record.newUnlocks.filter(item=>item.kind===kind).length;if(count)letter.append(el('p',label+' '+count+(kind==='character'?'명':kind==='pet'?'마리':'개')));}}
    layout.append(summary,letter);shell.append(layout);
    const advance=()=>{if(!live(active)||loading)return;stage++;paint();if(stage===2&&record.letter.status!=='ready'&&loadEnding)fetchLetter();};
    if(stage<2){const next=btn(stage===0?'계속':'편지 보기',advance,'ending-continue');next.disabled=loading||record.type==='PENDING';shell.append(next);if(record.type==='PENDING'&&!loading&&loadEnding)shell.append(btn(error?'다시 시도':'직업 결과 확인',fetchLetter,'ending-continue'));}
    else if(stage===2&&record.newUnlocks?.length){const next=btn('다음',advance,'ending-continue');next.disabled=record.letter.status!=='ready'||isSaveFailed();shell.append(next);}
    else{const final=btn('타이틀로',()=>{if(live(active)&&!isSaveFailed()&&record.letter.status==='ready')onComplete();},'ending-continue');final.disabled=record.letter.status!=='ready'||isSaveFailed();shell.append(final);}
   };paint();if(record.type==='PENDING'&&loadEnding)fetchLetter();return;
  }
  heading('아르카디아에서 그려 본 미래','ending-page');
  const layout=el('div',null,'ending-layout ending-career-art'),summary=el('aside',null,'paper ending-summary'),letter=el('article',null,'paper ending-letter');
  summary.append(shell.querySelector('h1'),el('h2',snapshot.character.name),el('p',snapshot.runNumber+'회차 · '+snapshot.week+'주차'),el('h3','현재 회차 실제 기록'));
  if(snapshot.hasHistory){for(const [label,key]of [['수업','classes'],['모험','adventures'],['휴식','rests']])summary.append(el('p',label+' '+snapshot.counts[key]+'회'));}
  else summary.append(el('p','활동 기록 미등록'));
  summary.append(el('small',snapshot.readyForEnding?'52주 종료 · 확정 결과 연결 대기':'진행 중인 회차의 화면 미리보기'));
  const actions=el('div',null,'actions');actions.append(btn(example?'실제 연결 프레임 보기':'예시 편지 보기',()=>render({example:!example})));
  const retry=btn('결과 다시 확인',()=>refresh());retry.disabled=example||loading||!loadEnding;actions.append(retry);summary.append(actions);
  const value=example?exampleEnding(snapshot.character.name):response;
  letter.append(el('p',example?'예시 · 실제 판정/AI 생성 결과 아님':'엔딩 편지','ending-label'),el('h2',value?.career?.name??'미래 직업 결과를 기다리고 있어요'));
  if(example)letter.append(el('small','정식 직업·대사 미확정 · 저장/해금에 반영되지 않습니다.'));
  if(value?.letter?.status==='ready'){
   if(!example)letter.append(el('small',value.letter.source==='fallback'?'기본 편지':'AI가 작성한 개인화 편지'));
   for(const [title,key]of [['이번 이야기의 미래','future'],['이야기 돌아보기','reflection'],['미래 모습과 응원','encouragement']]){const section=el('section');section.append(el('h3',title),el('p',value.letter.sections[key]));letter.append(section);}
  }else{
   letter.append(el('p',error?'결과를 불러오지 못했습니다. 다시 확인할 수 있어요.':loading?'편지를 확인하고 있어요.':value?.letter?.status==='failed'?'편지를 아직 받지 못했어요. 직업 결과는 유지됩니다.':'편지가 도착할 자리를 준비해 두었어요.'));
   for(const title of ['이번 이야기의 미래','이야기 돌아보기','미래 모습과 응원']){const section=el('section',null,'ending-empty-section');section.append(el('h3',title),el('p','내용 연결 대기'));letter.append(section);}
  }
  if(error)letter.append(el('small',error));
  layout.append(summary,letter);shell.append(layout);shell.append(createCloseButton({el,btn,onClick:onReturn,label:'마이룸으로 닫기'}));
  async function refresh(){
   if(!loadEnding)return;
   const key={slotId:slotId(),runNumber:run.runNumber};render({loading:true});const requestGeneration=generation;
   try{const result=validateEndingView(await loadEnding(key),key);if(requestGeneration===generation&&shell.classList.contains('ending-page'))render({response:result});}
   catch(e){if(requestGeneration===generation&&shell.classList.contains('ending-page'))render({response,error:e.message});}
  }
  // Opening the frame reads prepared results only. No completion/save/AI mutation.
  if(loadEnding&&!example&&!response&&!error&&!loading&&id===generation)refresh();
 }
 function history(records=[],selected=0){
  generation++;heading('지난 엔딩 편지','ending-history-page');
  const layout=el('div',null,'ending-layout ending-career-art'),list=el('nav',null,'paper ending-summary'),letter=el('article',null,'paper ending-letter');
  for(const [index,record]of records.entries())list.append(btn(record.runNumber+'회차 · '+(record.careerName??'지난 여행'),()=>history(records,index),index===selected?'selected':'quiet'));
  const record=records[selected];
  if(record?.letter?.status==='ready'&&['future','reflection','encouragement'].every(key=>typeof record.letter.sections?.[key]==='string')){
   letter.append(el('h2',record.careerName??'지난 여행'),el('small',record.letter.source==='ai'?'AI가 작성한 개인화 편지':'아르카디아의 기본 편지'));
   for(const key of ['future','reflection','encouragement'])letter.append(el('p',record.letter.sections[key]));
   const metrics=displayedEndingRecords(record);if(metrics.length)letter.append(el('h3','아르카디아에서의 기록'));
   for(const metric of metrics)letter.append(el('p',ENDING_RECORD_LABELS[metric.key]+' · '+metric.value+'회'));
  }else letter.append(el('p',record?'저장된 편지를 확인할 수 없습니다.':'아직 완료한 여행의 편지가 없어요.'));
  layout.append(list,letter);shell.append(layout,btn('마이룸으로',onReturn));
 }
 return {render,history};
}
