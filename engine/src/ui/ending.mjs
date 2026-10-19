import {endingSnapshot,validateEndingView,exampleEnding,displayedEndingRecords,ENDING_RECORD_LABELS} from '../core/ending-frame.mjs';
import {ENDING_SUBTITLES} from '../core/ending-system.mjs';
import {createEndingJourney} from './ending-journey.mjs';
import {createCloseButton} from './button-art.mjs';

export function createEndingUI({el,btn,shell,heading,current,character,slotId,onReturn,onComplete=()=>{},loadEnding=null,onReceive=()=>false,isSaveFailed=()=>false,onWelcome}){
 let generation=0;
 function render({example=false,response=null,error='',loading=false}={}){
  const id=++generation,run=current(),snapshot=endingSnapshot(run,character());
  if(arguments[0]?.actual){
   const record=run.endingRecord,key={slotId:slotId(),runNumber:run.runNumber};let received=null;
   const sameRun=()=>id===generation&&current()===run&&slotId()===key.slotId;
   const journey=createEndingJourney({el,btn,shell,heading,current,onWelcome,
    async onPrepare({ready,active}){
     const live=()=>sameRun()&&active();
     if(!live())return false;
     if(record.letter.status!=='ready'||isSaveFailed()){
      if(!loadEnding&&!received)return false;
      const value=received??validateEndingView(await loadEnding(key),key);if(!live())return false;
      received=value;if(!onReceive(value))return false;received=null;
     }
     if(record.letter.status!=='ready'||isSaveFailed())return false;
     ready({careerName:record.careerName,subtitle:ENDING_SUBTITLES[record.careerId],source:record.letter.source,content:['future','reflection','encouragement'].map(key=>record.letter.sections[key]).join('\n\n')});
     return true;
    },
    getUnlocks:()=>(record.newUnlocks??[]).map(item=>({...item,label:{character:'새로운 캐릭터',pet:'새로운 펫',badge:'새로운 배지',background:'새로운 마이룸 배경'}[item.kind]})),
    onFinish(){if(!sameRun()||record.letter.status!=='ready'||isSaveFailed())return false;onComplete();return true;},
    onTitle:onComplete
   });
   journey.render({resume:record.letter.status==='ready'});return;
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
  letter.append(el('p',example?'예시 · 실제 결과 아님':'엔딩 편지','ending-label'),el('h2',value?.career?.name??'미래 직업 결과를 기다리고 있어요'));
  if(example)letter.append(el('small','정식 직업·대사 미확정 · 저장/해금에 반영되지 않습니다.'));
  if(value?.letter?.status==='ready'){
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
   letter.append(el('h2',record.careerName??'지난 여행'));
   for(const key of ['future','reflection','encouragement'])letter.append(el('p',record.letter.sections[key]));
   const metrics=displayedEndingRecords(record);if(metrics.length)letter.append(el('h3','아르카디아에서의 기록'));
   for(const metric of metrics)letter.append(el('p',ENDING_RECORD_LABELS[metric.key]+' · '+metric.value+'회'));
  }else letter.append(el('p',record?'저장된 편지를 확인할 수 없습니다.':'아직 완료한 여행의 편지가 없어요.'));
  layout.append(list,letter);shell.append(layout,btn('마이룸으로',onReturn));
 }
 return {render,history};
}
