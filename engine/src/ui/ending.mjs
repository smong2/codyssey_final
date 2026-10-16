import {endingSnapshot,validateEndingView,exampleEnding} from '../core/ending-frame.mjs';

export function createEndingUI({el,btn,shell,heading,current,character,slotId,onReturn,onComplete=()=>{},loadEnding=null}){
 let generation=0;
 function render({example=false,response=null,error='',loading=false}={}){
  const id=++generation,run=current(),snapshot=endingSnapshot(run,character());
  if(arguments[0]?.actual){
   const record=run.endingRecord;let stage=0;
   const paint=()=>{
    const active=++generation;heading('아르카디아에서 그려 본 미래','ending-page');
    const layout=el('div',null,'ending-layout'),summary=el('aside',null,'paper ending-summary'),letter=el('article',null,'paper ending-letter');
    summary.append(shell.querySelector('h1'),el('h2',snapshot.character.name),el('p',snapshot.runNumber+'회차 · 52주차'),el('h3','이번 회차 기록'));
    const metricNames={classes:'전체 수업',adventures:'모험',importantChoices:'중요 선택',npcStoriesCompleted:'NPC 개별 스토리 완료',locationsDiscovered:'장소 발견',npcMeetings:'NPC 만남',specialItemDiscoveries:'특별 아이템·발견물'};
    const rows=record?.records??[];for(const metric of rows.filter(item=>Object.hasOwn(metricNames,item.key)))summary.append(el('p',metricNames[metric.key]+' · '+(metric.value===null?'기록 없음':metric.value)));
    if(stage===0){letter.append(el('p','최종 질문','ending-label'),el('h2','무엇을 지켰니?'),el('p','이 질문은 정답을 요구하지 않습니다.','ending-placeholder'));}
    else if(stage===1){letter.append(el('p','이번 회차의 진로','ending-label'),el('h2',record?.careerName??'진로 결과 준비 대기'),el('p',record?.type==='FALLBACK'?'여러 분야를 경험하며 앞으로 선택할 수 있는 길을 넓혔습니다.':'기록된 성장 스탯과 회차 활동으로 진로를 정리했습니다.','ending-placeholder'));
     for(const check of record?.checks??[])letter.append(el('p',(check.condition?.label??check.condition?.key)+' · '+(check.value===null?'기록 없음':check.value)+' / 기준 '+check.condition?.value));
    }else{letter.append(el('p','엔딩 편지','ending-label'),el('h2',record?.letter?.status==='pending'?'편지 연결 대기':'편지'),el('p','개인화 편지 원고/API가 아직 연결되지 않았습니다. 내용을 임의로 만들지 않았습니다.','ending-placeholder'));}
    layout.append(summary,letter);shell.append(layout);
    if(stage<2)shell.append(btn('다음',()=>{stage++;paint();},'ending-continue'));
    else shell.append(btn('타이틀로',()=>{if(active===generation)onComplete();},'ending-continue'));
   };paint();return;
  }
  heading('아르카디아에서 그려 본 미래','ending-page');
  const layout=el('div',null,'ending-layout'),summary=el('aside',null,'paper ending-summary'),letter=el('article',null,'paper ending-letter');
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
   if(!example)letter.append(el('small',value.letter.source==='fallback'?'기본 편지':'개인화 편지'));
   for(const [title,key]of [['이번 이야기의 미래','future'],['이야기 돌아보기','reflection'],['미래 모습과 응원','encouragement']]){const section=el('section');section.append(el('h3',title),el('p',value.letter.sections[key]));letter.append(section);}
  }else{
   letter.append(el('p',error?'결과를 불러오지 못했습니다. 다시 확인할 수 있어요.':loading?'편지를 확인하고 있어요.':value?.letter?.status==='failed'?'편지를 아직 받지 못했어요. 직업 결과는 유지됩니다.':'편지가 도착할 자리를 준비해 두었어요.'));
   for(const title of ['이번 이야기의 미래','이야기 돌아보기','미래 모습과 응원']){const section=el('section',null,'ending-empty-section');section.append(el('h3',title),el('p','내용 연결 대기'));letter.append(section);}
  }
  if(error)letter.append(el('small',error));
  layout.append(summary,letter);shell.append(layout);const close=btn('X',onReturn,'close-x');close.setAttribute('aria-label','마이룸으로 닫기');shell.append(close);
  async function refresh(){
   if(!loadEnding)return;
   const key={slotId:slotId(),runNumber:run.runNumber};render({loading:true});const requestGeneration=generation;
   try{const result=validateEndingView(await loadEnding(key),key);if(requestGeneration===generation&&shell.classList.contains('ending-page'))render({response:result});}
   catch(e){if(requestGeneration===generation&&shell.classList.contains('ending-page'))render({response,error:e.message});}
  }
  // Opening the frame reads prepared results only. No completion/save/AI mutation.
  if(loadEnding&&!example&&!response&&!error&&!loading&&id===generation)refresh();
 }
 return {render};
}
