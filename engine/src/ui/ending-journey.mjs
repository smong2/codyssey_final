import {endingYearSummary} from '../core/ending-frame.mjs';

const RETROSPECT='아르카디아에서 보낸 1년 동안\n너는 많이 웃고, 많이 배우고, 때로는 고민도 했어.\n그래도 끝까지 네 마음을 지키며 한 걸음씩 나아왔어.\n이제 너의 이야기를 천천히 돌아보자.';

// Adapters own career selection and persistence. This component only displays
// their validated results, and waits for both the text reveal and the letter.
export function createEndingJourney({el,btn,shell,heading,current,onWelcome,onPrepare,onFinish,onTitle,getUnlocks=()=>null}){
 let generation=0,stage='',surface=null,questionTimer=null,summary=null,result=null,busy=false,revealed=false,completed=false,operation=0;
 const live=id=>id===generation&&surface?.isConnected!==false&&(stage==='welcome'||stage==='summary'||shell.classList.contains('ending-page'));
 const button=(label,action)=>btn(label,action,'ending-art-button');
 function scene(title){
  heading(title,'ending-page');surface=el('section',null,'ending-scene');shell.append(surface);return surface;
 }
 function popup(){
  onWelcome?.();if(!onWelcome)scene('아르카디아에서 보낸 1년');
  for(const child of shell.children)child.inert=true;
  surface=el('section',null,'ending-overlay');surface.setAttribute('role','dialog');surface.setAttribute('aria-modal','true');
  const card=el('article',null,'ending-card');card.tabIndex=-1;surface.append(card);shell.append(surface);
  queueMicrotask(()=>{if(card.isConnected)card.focus?.({preventScroll:true});});return card;
 }
 function welcome(){
  stage='welcome';const card=popup();card.classList.add('ending-welcome');card.setAttribute('aria-label','1년 동안 정말 잘 해냈어!');
  card.append(el('h2','1년 동안 정말 잘 해냈어!'),el('div','✦','ending-ornament'),el('p',RETROSPECT,'ending-retrospect'),button('엔딩 보기',yearSummary));
 }
 function yearSummary(){
  stage='summary';const card=popup();card.classList.add('ending-year-summary');card.setAttribute('aria-label','한 해의 성장과 기록');
  const header=el('header');header.append(el('h2','이런 멋진 한 해를 보냈어요!'),el('p','수많은 선택과 새로운 경험이 모여, 지금의 너를 만들었어요.\n아르카디아에서의 1년을 함께 돌아볼까요?'));
  const panels=el('div',null,'ending-summary-panels'),stats=el('section',null,'ending-growth'),records=el('section',null,'ending-counts');
  stats.append(el('h3','마음의 성장'));records.append(el('h3','함께한 시간'));
  for(const {key,label,value} of summary.stats){
   const row=el('div',null,'ending-growth-row'),bar=el('progress');bar.max=500;bar.value=value;bar.setAttribute('aria-label',label);
   row.setAttribute('data-stat',key);row.append(el('span',label),bar,el('strong',String(value)));stats.append(row);
  }
  for(const {label,value} of summary.records){const row=el('p',null,'ending-count-row');row.append(el('span',label),el('strong',value+'회'));records.append(row);}
  if(!summary.stats.length)stats.append(el('p','저장된 성장 정보를 확인하고 있어요.'));
  if(!summary.records.length)records.append(el('p','저장된 활동 기록을 확인하고 있어요.'));
  panels.append(stats,records);card.append(header,panels,button('편지 보기',question));
 }
 function question(){
  stage='question';result=null;revealed=false;busy=false;operation++;
  scene('무엇을 지켰니?');surface.classList.add('ending-question-scene');
  surface.append(el('span','✦','ending-question-star'),el('h2','무엇을 지켰니?','ending-question-text'));
  const status=el('div',null,'ending-question-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');surface.append(status);
  const id=generation;questionTimer=setTimeout(()=>{questionTimer=null;if(!live(id))return;revealed=true;if(result)letter();},3200);
  void prepare(status);
 }
 async function prepare(status){
  if(busy)return;busy=true;const id=generation,ticket=++operation;
  status.replaceChildren(el('p','너에게 전할 편지를 준비하고 있어요…'));
  const active=()=>live(id)&&ticket===operation&&stage==='question';
  const ready=value=>{if(!active())return;result=value;busy=false;status.replaceChildren(el('p','너를 위한 편지가 도착했어요.'));if(revealed)letter();};
  try{const ok=await onPrepare({ready,active});if(ok===false&&active())failed();}
  catch{if(active())failed();}
  function failed(){busy=false;status.replaceChildren(el('p','편지를 아직 받지 못했어요. 잠시 후 다시 확인해 주세요.'),button('다시 시도',()=>prepare(status)));}
 }
 function letter(){
  stage='letter';scene('아르카디아에서 온 편지');
  const card=el('article',null,'ending-card ending-final-letter'),body=el('div',null,'ending-letter-body');
  card.append(el('p','너의 빛은 이런 모습으로 자라났어요.','ending-letter-kicker'),el('h2','너는 ‘'+result.careerName+'’가 될 거야!'));
  if(result.subtitle)card.append(el('p','《'+result.subtitle+'》','ending-letter-subtitle'));
  body.setAttribute('tabindex','0');body.setAttribute('aria-label','엔딩 편지');body.append(el('p',result.content,'ending-letter-content'));card.append(body);
  card.append(button('다음 이야기로',()=>{
   if(busy)return;const unlocks=getUnlocks();if(unlocks?.length)unlocksPage(unlocks);else return finish();
  }));surface.append(card);
 }
 function unlocksPage(unlocks){
  stage='unlocks';scene('새로운 이야기가 기다리고 있어요');const card=el('article',null,'ending-card ending-unlocks');
  card.append(el('h2','이번 여행으로 새롭게 열린 것'));
  const groups=new Map();for(const item of unlocks)groups.set(item.label,(groups.get(item.label)??0)+1);
  for(const [label,count] of groups)card.append(el('p',label+' · '+count));
  card.append(button('타이틀로',()=>{if(completed)onTitle();else return finish();}));surface.append(card);
 }
 async function finish(){
  if(busy)return;busy=true;const id=generation,ticket=++operation;
  const controls=surface.querySelectorAll?.('button')??[];for(const control of controls)control.disabled=true;
  const ready=unlocks=>{if(!live(id)||ticket!==operation)return;busy=false;completed=true;if(unlocks?.length)unlocksPage(unlocks);else onTitle();};
  try{const ok=await onFinish({ready,active:()=>live(id)&&ticket===operation});if(ok===false&&live(id))failed();}
  catch{if(live(id))failed();}
  function failed(){
   busy=false;for(const control of controls)control.disabled=false;
   if(!surface.querySelector('.ending-save-status')){const note=el('p','저장을 마치지 못했어요. 다시 눌러 주세요.','ending-save-status');note.setAttribute('role','status');surface.append(note);}
  }
 }
 function render({resume=false}={}){
  generation++;operation++;clearTimeout(questionTimer);questionTimer=null;busy=false;completed=false;result=null;summary=endingYearSummary(current());
  if(resume)question();else welcome();
 }
 return {render};
}
