import {attachIntro} from './intro-player.mjs';
import {enterWorld} from './world-layout.mjs';
import {tapAllowed,cardClickAllowed} from './pointer-controls.mjs';
import {freshState,applyEvent,objectiveId} from './state.mjs';
import {loadSave,commitState} from './storage.mjs';
import {connected,rotate,reachable} from './puzzle.mjs';
import {startAdventure} from './adventure.mjs';
import {syncAdventurePause} from './input-pause.mjs';
import {renderStory,dialogueLines,recordBody,knowledgeBody,esc,button,image} from './story-view.mjs';

const app=document.querySelector('#app'),modalRoot=document.querySelector('#modal-root');
let introDispose=null,cardPointer=null,suppressCard=false;
let content,characters,state=freshState(),saved=loadSave(),game=null,pending=null,timer=null,toastTimer,modalInvoker,windowPaused=false;
const ui={selected:'CH01',gender:'male',smallChoice:null};
const transient=new Set(['entry','awakening','reveal','title','select','bernTalk','bernTalkChoice','bernTalkReaction','bernRepeat']);
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);}
function openModal(title,body,cls='',locked=false){
 modalInvoker=document.activeElement;game?.pause(true);
 modalRoot.innerHTML=`<div class="modal-backdrop"><dialog open class="modal ${cls}" aria-labelledby="modal-title" aria-modal="true">${locked?'':button('×','close','modal-close','aria-label="닫기"')}<h2 id="modal-title">${esc(title)}</h2>${body}</dialog></div>`;
 modalRoot.querySelector('button')?.focus();
}
function closeModal(){if(pending)return;if(!modalRoot.children.length)return;modalRoot.innerHTML='';game?.pause(false);if(modalInvoker?.isConnected)modalInvoker.focus();}
function saveFailure(next,after){
 pending={next,after};clearTimeout(timer);game?.pause(true);
 openModal('저장하지 못했어요. 다시 시도해 주세요.',`<p>지금 화면에서 다시 시도할 수 있어요.</p>${button('다시 시도하기','retry-save')}`,'save-error',true);
}
function accept(next,after){
 const oldScene=state.scene;state=next;
 if(!transient.has(next.scene))saved={state:structuredClone(next),error:null};
 if(oldScene!==next.scene){game?.destroy();game=null;closeModal();render();}
 else if(game){game.updateState(state);refreshAdventure();}
 else {closeModal();render();}
 after?.();
 syncAdventurePause(game,{pending:!!pending,modalOpen:!!modalRoot.children.length,windowPaused});
}
function commit(next,after){
 if(pending)return false;
 if(transient.has(next.scene)){accept(next,after);return true;}
 const result=commitState(state,next);if(!result.ok){saveFailure(next,after);return false;}
 accept(result.state,after);return true;
}
function event(e,after){try{return commit(applyEvent(state,e,content),after);}catch(err){toast(err.message);return false;}}
function go(scene,fields={},after){let next=applyEvent(state,{type:'scene',scene},content);if(scene==='adventure')next=enterWorld(next,content.map);Object.assign(next,fields);return commit(next,after);}
function checkpoint(){
 if(!game||pending||document.hidden)return;
 const next=structuredClone(state);const result=commitState(state,next);
 if(!result.ok)saveFailure(next);else saved={state:next,error:null};
}
function render(){
 introDispose?.();introDispose=null;clearTimeout(timer);const grid=app.querySelector('.character-grid');if(grid)ui.scrollTop=grid.scrollTop;ui.saved=saved.state;ui.loadError=saved.error;
 app.innerHTML=renderStory(state,content,characters,ui);app.dataset.scene=state.scene;const newGrid=app.querySelector('.character-grid');if(newGrid)newGrid.scrollTop=ui.scrollTop??0;
 app.querySelectorAll('img').forEach(el=>el.addEventListener('error',()=>{el.classList.add('missing-asset');el.alt='이미지 준비 중';},{once:true}));
 const schedule=(ms,fn)=>{timer=setTimeout(()=>{timer=null;if(!pending)fn();},ms);};
 switch(state.scene){
 case 'awakening':introDispose=attachIntro(app.querySelector('#intro-video'),{complete:()=>go('reveal'),fallback:()=>{app.querySelector('#intro-video').hidden=true;app.querySelector('.intro-fallback').hidden=false;}});break;
 case 'reveal':schedule(700,()=>go('title'));break;
 case 'arrivalTransition':schedule(2500,()=>go('plazaArrival',{entryProgress:'arrivalTransitionSeen'}));break;
 case 'plazaArrival':schedule(1800,()=>go('valentinus',{firstArrivalSeen:true}));break;
 case 'episodeTitle':schedule(1800,()=>go('greenhouse',{titleSeen:true,episode1Status:'started'}));break;
 case 'dayEnd':schedule(3000,()=>go('morningIntro'));break;
 case 'adventure':mountAdventure();break;
 }
}
function mountAdventure(){
 try{game=startAdventure('game',content,state,{save:checkpoint,error:toast,target:o=>{const b=app.querySelector('.interact');if(!b)return;b.hidden=!o;if(o)b.textContent=`${matchMedia('(pointer:coarse), (max-width:700px)').matches?'':'E '}${o.action} · ${o.label}`;},interact});
  if(!state.adventureIntroSeen){const next=structuredClone(state);next.adventureIntroSeen=true;commit(next,()=>openModal('온실 살펴보기',`<p>${esc((matchMedia('(pointer:coarse), (max-width:700px)').matches?'왼쪽 조이스틱으로 움직이고, 가까이에서 살펴보기 버튼을 눌러 보세요.':content.copy.adventureIntro))}</p>${button('살펴보기','close')}`));}
 }catch(err){openModal('온실을 불러오지 못했어요.',`<p>${esc(err.message)}</p>${button('다시 시도하기','retry-adventure')}`,'',true);}
}
function refreshAdventure(){
 game?.refresh();const o=app.querySelector('#objective'),k=app.querySelector('#knowledge');
 if(o)o.textContent=content.objectives[objectiveId(state)];if(k)k.innerHTML=knowledgeBody(state,content);
}
function inspect(id){const fact=content.knowledge[id];event({type:'inspect',id},()=>openModal(fact.title,`<p>${esc(fact.text)}</p><p class="new-fact">새로운 사실을 발견했어요!</p>${button('닫기','close')}`));}
function stopAdventure(){openModal('온실 탐험을 그만할까요?',`<p>지금까지 찾은 것은 그대로 남아 있어요. 나중에 다시 와서 이어서 할 수 있어요.</p><div class="modal-actions">${button('계속 탐험하기','close','')}${button('그만하고 돌아가기','return-life')}</div>`);}
function interact(id){
 if(pending||modalRoot.children.length)return;
 switch(id){
 case 'plant':if(state.restored)event({type:'inspect',id:'glassFlowerSoil'},()=>openModal('유리꽃을 살펴봤어요.',`<p>${esc(content.inspection.flowerRecovered)}</p>${button('닫기','close')}`));else inspect('glassFlowerSoil');break;
 case 'sunlight':inspect('greenhouseSunlight');break;
 case 'herb':if(!state.herbs)openModal('달빛 약초를 찾았어요!',`<p>${esc(content.herb.discovery)}</p>${image(content,'herb','herb-discovery','달빛 약초')}<div class="modal-actions">${button('가방에 넣기','collect-herb')}</div>`);break;
 case 'rune':if(state.restored){openModal('오래된 룬',`<p>${esc(content.inspection.runeRecovered)}</p>${button('닫기','close')}`);}
  else if(state.runeObserved){showRunePaths();}else{event({type:'inspect',id:'runeLightBroken'},()=>openModal(content.knowledge.runeLightBroken.title,`<p>${esc(content.knowledge.runeLightBroken.text)}</p><p class="new-fact">새로운 사실을 발견했어요!</p>${button('계속 살펴보기','rune-paths')}`));}break;
 case 'exit':if(state.restored)event({type:'return-sion'});else stopAdventure();break;
 }
}
function showRunePaths(){openModal('오래된 룬',`<p>${esc(content.inspection.runePaths)}</p>${button('빛의 길 살펴보기','puzzle')}`);}
function puzzleTile(mask,index,active){
 const type=index===0?'start':index===8?'goal':mask===10?'straight':'elbow';const base={10:1,12:2,6:1,9:3,3:0,2:0,8:0}[mask];
 const angle=((base+state.puzzle.rotations[index])%4)*90,asset=type+(active.has(index)?'Active':'');
 return `<button class="rune-tile ${active.has(index)?'lit':''}" data-action="rotate" data-index="${index}" aria-label="${Math.floor(index/3)+1}행 ${index%3+1}열 ${index===0?'시작':index===8?'도착':'조각 회전'}" ${index===0||index===8?'disabled':''}>${image(content,'tile')}<img src="${esc(content.assets[asset])}" alt="" style="transform:rotate(${angle}deg)"></button>`;
}
function showPuzzle(){
 const active=reachable(state.puzzle);openModal('끊긴 빛의 길',`<p class="puzzle-note">조각을 눌러 돌려 보세요. 원에서 마름모까지 빛의 길을 이어 주세요.</p><div class="puzzle-grid">${state.puzzle.masks.map((m,i)=>puzzleTile(m,i,active)).join('')}</div>${state.hint?`<p class="hint-line">${esc(content.hints[state.hint-1])}</p>`:''}<div class="modal-actions">${button('힌트','puzzle-hint','')}${button('나가기','close','')}</div>`,'puzzle-modal');
}
function bag(){openModal('가방',state.herbs?`<div class="collection-grid"><article class="collection-card">${image(content,'herb','','달빛 약초')}<h3>${esc(content.herb.name)}</h3><p>× 1</p><p>${esc(content.herb.text)}</p></article></div>`:'<p>아직 모은 물건이 없어요.</p>');}
function diary(){openModal('다이어리',state.heartRecords.length?`<div class="diary-grid">${state.heartRecords.map(r=>`<button class="diary-card" data-action="open-record" data-id="${esc(r.id)}"><small>EP.01</small><h3>${esc(r.episode)}</h3></button>`).join('')}</div>`:'<p>아직 남긴 이야기가 없어요.</p>');}
function menu(){
 if(state.scene==='adventure')openModal('온실 탐험',`<div class="choice-list">${button('계속 탐험하기','close')}${button('탐험 그만하기','stop-adventure','')}${button('타이틀로 돌아가기','title','')}</div>`);
 else openModal('메뉴',`<div class="choice-list">${button('계속하기','close')}${button('타이틀로 돌아가기','title','')}</div>`);
}
function nextDialogue(){
 const lines=dialogueLines(state,content,ui);
 if(state.node<lines.length-1){const next=structuredClone(state);next.node++;commit(next);return;}
 switch(state.scene){
 case 'valentinus':go('sion',{valentinusMet:true});break;
 case 'sion':go('episodeTitle',{sionMet:true,episode1Status:'offered'});break;
 case 'greenhouse':go('adventure');break;
 case 'reaction':go('choice');break;
 case 'choiceReaction':event({type:'resolve'});break;
 case 'bern':go('reflection');break;
 case 'reflectionReply':go('record');break;
 case 'bernTalk':go('bernTalkChoice');break;
 case 'bernTalkReaction':ui.smallChoice=null;event({type:'bern-talk-complete'});break;
 case 'bernRepeat':go('roomFree');break;
 case 'morningIntro':event({type:'morning-seen'});break;
 }
}
function action(name,el){
 if(pending&&name!=='retry-save')return;
 switch(name){
 case 'start-entry':case 'replay-intro':go('awakening');break;
 case 'skip-intro':go('reveal');break;
 case 'new':if(saved.state?.characterConfirmed)openModal('새 이야기를 시작할까요?',`<p>이번 버전의 진행과 다이어리를 새 이야기로 바꿉니다.</p><div class="modal-actions">${button('다시 볼게요','close','')}${button('새 이야기 시작','confirm-new')}</div>`);else action('confirm-new');break;
 case 'confirm-new':game?.destroy();game=null;state=freshState();ui.selected='CH01';ui.gender='male';ui.smallChoice=null;go('select');break;
 case 'continue':saved=loadSave();if(saved.state){game?.destroy();game=null;state=saved.state;if(state.scene==='adventure')state=enterWorld(state,content.map);if(!state.characterConfirmed){state.scene='select';state.node=0;}render();}else{render();}break;
 case 'retry-load':saved=loadSave();render();break;
 case 'card':ui.selected=el.dataset.id;render();break;
 case 'gender':ui.scrollTop=0;ui.gender=el.dataset.id;ui.selected=characters.find(x=>x.gender===ui.gender).id;render();break;
 case 'enlarge':{const ch=characters.find(x=>x.id===el.dataset.id);if(ch)openModal(ch.name,`<img class="enlarged-character" src="${esc(ch.asset)}" alt="${esc(ch.name)}">`);break;}
 case 'confirm-character':if(el.dataset.id==='CH01')openModal('카엘과 이야기를 시작할까요?',`<div class="modal-actions">${button('다시 볼게요','close','')}${button('시작하기','start-character')}</div>`);break;
 case 'start-character':event({type:'confirm',id:'CH01'});break;
 case 'admission-next':go('arrivalTransition',{admissionRead:true});break;
 case 'next':nextDialogue();break;
 case 'choose':event({type:'choice',id:el.dataset.id});break;
 case 'room-next':go('bern');break;
 case 'reflect':event({type:'reflect',id:el.dataset.id});break;
 case 'save-diary':event({type:'diary'});break;
 case 'claim-reward':event({type:'reward'});break;
 case 'reward-next':if(state.heartIntroSeen)go('roomFree');else go('heartIntro');break;
 case 'heart-intro-next':go('roomFree',{heartIntroSeen:true});break;
 case 'bern-talk':go(state.bernShortTalkSeen?'bernRepeat':'bernTalk');break;
 case 'small-choice':if(content.bernTalk.choices.some(x=>x.id===el.dataset.id)){ui.smallChoice=el.dataset.id;go('bernTalkReaction');}break;
 case 'end-day':if(state.dayEndUnlocked)openModal('오늘을 마무리할까요? 다음 날 아침으로 넘어가요.',`<div class="modal-actions">${button('조금 더 있을래요','close','')}${button('오늘을 마무리하기','confirm-end-day')}</div>`);break;
 case 'confirm-end-day':event({type:'day-end'});break;
 case 'menu':menu();break;
 case 'title':checkpoint();if(!pending){game?.destroy();game=null;closeModal();state=freshState();state.scene='awakening';render();}break;
 case 'close':closeModal();break;
 case 'retry-save':{const work=pending;const result=commitState(state,work.next);if(result.ok){pending=null;modalRoot.innerHTML='';accept(result.state,work.after);}break;}
 case 'retry-adventure':closeModal();game?.destroy();game=null;render();break;
 case 'stop-adventure':stopAdventure();break;
 case 'return-life':go('greenhouse');break;
 case 'interact':game?.interact();break;
 case 'collect-herb':event({type:'collect'},()=>{toast('가방에 달빛 약초를 넣었어요.');closeModal();});break;
 case 'rune-paths':showRunePaths();break;
 case 'bag':bag();break;
 case 'diary':diary();break;
 case 'open-record':{const r=state.heartRecords.find(x=>x.id===el.dataset.id);if(r)openModal('오늘의 이야기',recordBody(state,content,r)+button('다이어리로 돌아가기','diary',''));break;}
 case 'hint':if(state.runeObserved&&!state.restored)showPuzzle();else openModal('힌트',`<p>${esc(content.objectives[objectiveId(state)])}</p><p>${esc(content.copy.adventureIntro)}</p>`);break;
 case 'puzzle':showPuzzle();break;
 case 'rotate':{const next=structuredClone(state);rotate(next.puzzle,Number(el.dataset.index));const solved=connected(next.puzzle);if(solved)next.restored=true;
  commit(next,()=>{if(solved){openModal(content.inspection.solved,`<p>온실로 빛이 퍼지고 있어요.</p>${button('온실 살펴보기','close')}`);game?.worldChange();}else{showPuzzle();modalRoot.querySelector(`[data-index="${el.dataset.index}"]`)?.focus();}});break;}
 case 'puzzle-hint':{const next=structuredClone(state);next.hint=Math.min(3,next.hint+1);commit(next,showPuzzle);break;}
 }
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el&&!el.disabled){if(['card','enlarge'].includes(el.dataset.action)&&!cardClickAllowed(suppressCard,e.detail))return;action(el.dataset.action,el);}});
document.addEventListener('pointerdown',e=>{if(e.target.closest('.character-grid')){cardPointer={x:e.clientX,y:e.clientY,time:performance.now()};suppressCard=false;}});
document.addEventListener('pointermove',e=>{if(cardPointer&&Math.hypot(e.clientX-cardPointer.x,e.clientY-cardPointer.y)>=10)suppressCard=true;});
document.addEventListener('pointerup',e=>{if(cardPointer){suppressCard=suppressCard||!tapAllowed(cardPointer,{x:e.clientX,y:e.clientY,time:performance.now()});cardPointer=null;}});
document.addEventListener('pointercancel',()=>{cardPointer=null;suppressCard=true;});
document.addEventListener('keydown',e=>{
 if((e.key==='Enter'||e.key===' ')&&e.target.matches('.life-dialogue[data-action]')){e.preventDefault();action('next');}
 if(e.key==='Escape'&&!pending){if(modalRoot.children.length)closeModal();else if(!['entry','awakening','reveal','title','arrivalTransition','plazaArrival','episodeTitle','dayEnd'].includes(state.scene))menu();}
 if(e.key==='Tab'&&modalRoot.children.length){const items=[...modalRoot.querySelectorAll('button:not(:disabled)')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
});
window.addEventListener('blur',()=>{windowPaused=true;checkpoint();game?.pause(true);});
window.addEventListener('focus',()=>{windowPaused=false;syncAdventurePause(game,{pending:!!pending,modalOpen:!!modalRoot.children.length,windowPaused});});
window.addEventListener('beforeunload',()=>{if(game&&!pending)commitState(state,structuredClone(state));});
try{
 const response=await fetch('content.json'),catalogue=await fetch('characters.json');if(!response.ok||!catalogue.ok)throw Error('콘텐츠를 읽지 못했어요.');
 content=await response.json();characters=await catalogue.json();if(saved.state||saved.error)state.scene='entry';render();
}catch(err){app.innerHTML=`<main class="load-error"><h2>이야기를 불러오지 못했어요.</h2><p>${esc(err.message)}</p>${button('다시 시도하기','reload-content')}</main>`;app.addEventListener('click',e=>{if(e.target.closest('[data-action="reload-content"]'))location.reload();});}
