import {CHARACTERS,startRun,setSchedule,actionToken,applyAction,finishWeek,deleteSlot} from './core/state.mjs';
import {classOf} from './core/classes.mjs';
import {createMinigameStartData} from './core/minigame-contract.mjs';
import {currentAction,activityResultText} from './core/activity-rules.mjs';
import {titleModel} from './core/preview.mjs';
import {createLocalRepository,createBoundaryWriter} from './core/storage.mjs';
import {previewScenes} from './scenes/PreviewScenes.mjs';
import {SPACES} from '../minigame-demo/src/ui/theme.js';
import {createMyroomUI,DESCRIPTIONS} from './ui/myroom.mjs';
import {createJournalUI} from './ui/journal.mjs';
import {firstEmptySlot,recentSlot,createNotifier,invitationLines,ADMISSION_SCENES} from './core/ui-flow.mjs';
import {introFrame} from './core/intro.mjs';
import {mountAdventure} from './scenes/AdventureScene.mjs';
import {studentCards} from './core/catalogue.mjs';
import {fitPortraitBounds} from './core/portrait-layout.mjs';
import {createRoomLight} from './core/room-light.mjs';
import {appendCharacterInfo} from './ui/character-info.mjs';
import {createEndingUI} from './ui/ending.mjs';
import {activePet} from './core/pets.mjs';
import {createTitleAudioController} from './core/title-audio.mjs';
const roomLight=createRoomLight();let previousRoomBackground=null;
function decorateRoom(){const bg='url("./world-assets/'+roomLight.background+'")';shell.style.setProperty('--room-bg',bg);shell.style.setProperty('--previous-room-bg',previousRoomBackground??bg);shell.dataset.roomTime=roomLight.time;shell.classList.toggle('room-light-change',Boolean(previousRoomBackground&&previousRoomBackground!==bg));previousRoomBackground=bg;}
function reflectRoom(){roomLight.event('reflect');decorateRoom();}
let adventureView=null;
let portraitObserver=null;
const shell=document.querySelector('#shell'),notice=document.querySelector('#notice');
let profile,writer,repository,slotId,pending,saveFailed=false,monthOffset=0,view='intro',introTimer,introAnimation,titleAudioSyncAnimation=0,audioSync=()=>{},introTimePosition=0;
const asset=(category,file)=>'./design-assets/'+category+'/'+file;
function el(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
const notify=createNotifier(notice);
function message(text){notify(text);}
function btn(text,action,cls=''){const b=el('button',text,cls);b.type='button';b.onclick=()=>{try{action();}catch(e){message(e.message);}};return b;}
let refreshAudioToggle=()=>{};
const titleAudio=createTitleAudioController({onBlocked(){refreshAudioToggle();},onSoundError(kind,error){console.warn('효과음 재생 실패:',kind,error);}});
document.addEventListener('click',event=>{const button=event.target instanceof Element?event.target.closest('button'):null;if(button&&!button.disabled){if(titleAudio.isBlocked()&&!button.classList.contains('audio-toggle'))titleAudio.resume();titleAudio.playClick(button.dataset.sfx);}},true);
function blackDissolve(action,duration=900){
 const cover=el('div',null,'black-dissolve');cover.setAttribute('aria-hidden','true');document.body.append(cover);
 requestAnimationFrame(()=>{cover.classList.add('black-dissolve-active');setTimeout(()=>{action();requestAnimationFrame(()=>{cover.classList.remove('black-dissolve-active');setTimeout(()=>cover.remove(),duration);});},duration);});
}
function audioToggle(){
 const toggle=el('button',null,'audio-toggle');toggle.type='button';
 const paint=muted=>{
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
  const path=(d)=>{const node=document.createElementNS('http://www.w3.org/2000/svg','path');node.setAttribute('d',d);svg.append(node);};
  path('M11 5 6 9H2v6h4l5 4V5z');
  if(muted){path('m17 9 5 6');path('m22 9-5 6');}else{path('M15.54 8.46a5 5 0 0 1 0 7.07');path('M19.07 4.93a10 10 0 0 1 0 14.14');}
  toggle.replaceChildren(svg);toggle.setAttribute('aria-label',muted?'BGM 켜기':'BGM 끄기');toggle.setAttribute('aria-pressed',String(muted));toggle.title=muted?'BGM 켜기':'BGM 끄기';
 };
 refreshAudioToggle=()=>paint(titleAudio.isBgmMuted()||titleAudio.isBlocked());refreshAudioToggle();toggle.onclick=()=>{audioSync();if(titleAudio.isBlocked()){titleAudio.setBgmMuted(false);titleAudio.resume();}else titleAudio.toggleBgmMute();refreshAudioToggle();};return toggle;
}
function img(category,file,alt,cls){const i=el('img',null,cls);i.src=asset(category,file);i.alt=alt;return i;}
function current(){return profile.slots[slotId-1].activeRun;}
function heading(title,cls='page'){cancelAnimationFrame(titleAudioSyncAnimation);titleAudioSyncAnimation=0;portraitObserver?.disconnect();portraitObserver=null;if(adventureView){adventureView.destroy();adventureView=null;}view=cls;document.querySelector('#game').hidden=true;shell.hidden=false;shell.className=cls;shell.replaceChildren(el('h1',title));shell.scrollTop=0;shell.append(el('p','실행형 화면 시안 · 계정/백엔드/시나리오 미연결','preview-label'));}
function npcStage(image){
 const stage=el('div',null,'npc-portrait-stage');stage.append(image);let bounds;
 const fit=()=>{if(!bounds||!stage.isConnected)return;const p=fitPortraitBounds(stage.clientWidth,stage.clientHeight,image.naturalWidth,image.naturalHeight,bounds);for(const k of ['width','height','left','top'])image.style[k]=p[k]+'px';};
 image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,top=canvas.height,right=-1,bottom=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}bounds=right>=left?{x:left,y:top,width:right-left+1,height:bottom-top+1}:{x:0,y:0,width:canvas.width,height:canvas.height};fit();};
 portraitObserver=new ResizeObserver(fit);portraitObserver.observe(stage);return stage;
}
function save(retry=false,savedSlotId=slotId){try{retry?writer.retry():writer.save(profile,savedSlotId);saveFailed=false;message('로컬 자동 저장 완료. 주중 새로고침은 마지막 저장 시점으로 돌아갑니다.');}catch(e){saveFailed=true;message('저장 실패: '+e.message);}}
function selectPet(id){
 if(saveFailed)return false;
 try{repository.saveSettings({activePetId:id});profile.settings={...(profile.settings??{}),activePetId:id};message(activePet(profile).name+'과 함께합니다.');return true;}
 catch(e){message('펫 선택을 저장하지 못했습니다. '+e.message);return false;}
}
function modal(title,body,actions=[]){
 const d=el('dialog',null,'paper-modal');d.setAttribute('aria-label',title);d.append(el('h2',title),body);
 const a=el('div',null,'actions');for(const b of actions)a.append(b);const close=btn('X',()=>d.close(),'close-x');close.setAttribute('aria-label','닫기');d.append(close,a);
 d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();return d;
}
function emptyFrame(title,description,actions=[]){const body=el('div',null,'empty-frame');body.append(el('div','◇','empty-symbol'),el('p',description),el('small','백엔드 데이터 연결 예정 · 임의 데이터 없음'));modal(title,body,actions);}
function soundSettings(){
 const body=el('div',null,'sound-settings'),bgm=btn('',()=>{titleAudio.toggleBgmMute();refresh();}),sfx=btn('',()=>{titleAudio.toggleSfxMute();refresh();});
 const refresh=()=>{bgm.textContent='BGM · '+(titleAudio.isBgmMuted()?'꺼짐':'켜짐');sfx.textContent='효과음 · '+(titleAudio.isSfxMuted()?'꺼짐':'켜짐');bgm.setAttribute('aria-pressed',String(!titleAudio.isBgmMuted()));sfx.setAttribute('aria-pressed',String(!titleAudio.isSfxMuted()));};
 body.append(bgm,sfx);refresh();modal('소리 설정',body);
}
function canLeave(){return !saveFailed&&!['ACTING','WEEK_COMPLETE'].includes(current().phase);}
function menu(){
 const existing=shell.querySelector('.menu-popover');if(existing&&!existing.classList.contains('menu-closing')){shell.classList.remove('menu-open');existing.classList.add('menu-closing');existing.inert=true;for(const child of shell.children)if(child!==existing)child.inert=false;shell.querySelector('[aria-label="메뉴"]')?.setAttribute('aria-expanded','false');shell.querySelector('[aria-label="메뉴"]')?.focus({preventScroll:true});setTimeout(()=>existing.remove(),220);return;}existing?.remove();
 const pop=el('div',null,'menu-popover paper');pop.setAttribute('aria-label','메뉴 항목');shell.querySelector('[aria-label="메뉴"]')?.setAttribute('aria-expanded','true');
 const close=()=>{shell.classList.remove('menu-open');pop.classList.add('menu-closing');pop.inert=true;for(const child of shell.children)if(child!==pop)child.inert=false;setTimeout(()=>pop.remove(),220);shell.querySelector('[aria-label="메뉴"]')?.setAttribute('aria-expanded','false');shell.querySelector('[aria-label="메뉴"]')?.focus({preventScroll:true});};
 const entry=(label,action)=>btn(label,()=>{close();if(label==='오늘 돌아보기')reflectRoom();if(label==='오늘을 마무리하기'&&current().phase==='WEEK_COMPLETE')roomLight.event('next-day');action();});
 pop.append(entry('소리 설정',soundSettings));
 pop.append(entry('계속하기',()=>{}),entry('오늘 돌아보기',()=>emptyFrame('오늘 돌아보기','돌아보기 질문과 기록 데이터 연결 예정',[btn('다이어리에 남기기',()=>message('저장할 기록 데이터가 아직 없습니다.'))])),entry('오늘을 마무리하기',()=>{if(current().phase==='WEEK_COMPLETE'){finishWeek(profile,slotId);save();renderRoom();}else message('오늘의 수업 또는 휴식을 먼저 마쳐 주세요. 날짜는 중복 진행하지 않습니다.');}),entry('관계',()=>emptyFrame('관계','NPC 관계 데이터 연결 예정')),entry('방 변경·퍼즐',()=>journalUI.bag('마이룸')),entry('전체 흐름 보기',()=>emptyFrame('전체 흐름 · 진행 상태 변경 없음','미작성 화면의 연결 프레임입니다.',['메인 스토리','중간 이벤트','최종 이벤트 · 엔딩'].map(k=>btn(k,()=>{document.querySelector('dialog')?.close();storyFrame(k,renderRoom);})))));
 const back=entry('타이틀로 돌아가기',()=>renderTitle());back.disabled=!canLeave();pop.append(back);if(!canLeave())pop.append(el('small','이번 주 일정과 주말 저장 후 타이틀로 돌아갈 수 있습니다.'));shell.append(pop);shell.classList.add('menu-open');const x=btn('X',close,'close-x');x.setAttribute('aria-label','메뉴 닫기');pop.prepend(el('h2','메뉴'),x);for(const child of shell.children)if(child!==pop)child.inert=true;pop.querySelector('button').focus({preventScroll:true});pop.onkeydown=e=>{if(e.key!=='Tab')return;const buttons=[...pop.querySelectorAll('button:not([disabled])')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus({preventScroll:true});}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus({preventScroll:true});}};
}
function renderDialogueFrame(){
 heading('베른과 이야기하기','dialogue-preview-page');
 const nav=el('nav',null,'story-top-controls');nav.append(btn('대화기록',()=>emptyFrame('대화기록','실제 베른 대화 기록은 아직 없습니다.'),'text-button'),btn('건너뛰기',renderRoom,'text-button'));shell.append(nav);
 shell.append(npcStage(img('bern','owl1.png','베른','npc-dialogue-image')));
 const frame=el('section',null,'paper dialogue-preview-box');frame.append(el('h2','베른 · 대화 프레임'),el('p','대화 원고가 아직 등록되지 않았습니다.'),el('small','임의 대사·선택·관계 변경 없음'),btn('마이룸으로',renderRoom));shell.append(frame);
}
function storyFrame(kind,onReturn){if(kind==='최종 이벤트 · 엔딩'){endingUI.render({example:true});return;}heading(kind,'story-page');shell.append(el('p','시나리오 데이터가 아직 등록되지 않았습니다.','empty-frame'),el('p','이 화면은 연결 프레임입니다. 이야기를 완료하거나 보상을 지급하지 않습니다.'),btn(kind==='메인 스토리'?'내용 미등록 · 마이룸으로': '마이룸으로 돌아가기',onReturn));}
function renderTitle(animated=false,overlayVideo=null,audioEntry='direct'){
 clearTimeout(introTimer);cancelAnimationFrame(introAnimation);cancelAnimationFrame(titleAudioSyncAnimation);titleAudioSyncAnimation=0;heading('','title-page');
 const wrap=el('div',null,'logo-group');
 // Clip in original image coordinates so portrait/landscape letterboxing stays aligned.
 const svgNode=(tag,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
 const logo=svgNode('svg',{viewBox:'0 0 1774 887',class:'title-logo',role:'img','aria-label':'LUMIA · 루미아 전기: 마음을 품은 룬'}),defs=svgNode('defs');
 const revealRegions=[{x:0,y:704,width:1774,height:183},{x:370,y:642,width:1050,height:24},{x:806,y:588,width:152,height:116}];
 const goldMask=svgNode('mask',{id:'title-gold-mask',maskUnits:'userSpaceOnUse',x:0,y:0,width:1774,height:887});goldMask.append(svgNode('rect',{x:0,y:0,width:1774,height:887,fill:'white'}));
 const subtitleClip=svgNode('clipPath',{id:'title-subtitle-clip'}),decorationClip=svgNode('clipPath',{id:'title-decoration-clip'});
 for(const [i,region]of revealRegions.entries()){goldMask.append(svgNode('rect',{...region,fill:'black'}));(i===0?subtitleClip:decorationClip).append(svgNode('rect',region));}defs.append(goldMask,subtitleClip,decorationClip);
 logo.append(defs);
 logo.append(svgNode('image',{href:asset('ui','lumia_logo_final_034.png'),width:1774,height:887,mask:'url(#title-gold-mask)',class:'logo-wordmark'}),svgNode('image',{href:asset('ui','lumia_logo_final_034.png'),width:1774,height:887,'clip-path':'url(#title-decoration-clip)',class:'logo-decoration'}),svgNode('image',{href:asset('ui','lumia_logo_final_034.png'),width:1774,height:887,'clip-path':'url(#title-subtitle-clip)',class:'logo-subtitle'}));
 wrap.append(img('effect','lumia_logo_glow_003.png','','logo-glow'),logo);
 const particles=el('div',null,'gold-particles');particles.setAttribute('aria-hidden','true');for(let i=0;i<24;i++){const p=el('i');p.style.cssText=`--x:${18+(i*29)%66}%;--y:${10+(i*17)%58}%;--delay:${-(i%8)}s;--size:${1+i%3}px`;particles.append(p);}wrap.append(particles);
 const actions=el('div',null,'title-actions');if(!profile){actions.append(el('p','저장 데이터를 읽지 못했습니다. 기존 데이터를 보존했습니다.'));}else{
 const m=titleModel(profile),start=btn(m.startLabel,renderEmptySlots);start.disabled=saveFailed;actions.append(start);if(m.continueVisible)actions.append(btn('이어서 하기',renderSlots,'quiet'));if(m.startDisabled)actions.append(el('p','5개 슬롯이 모두 사용 중입니다.'));
 }
 shell.append(wrap,actions,btn('다시 보기',renderIntro,'text-button title-replay'),audioToggle());if(overlayVideo){overlayVideo.className='intro-overlay';shell.prepend(overlayVideo);}shell.classList.toggle('title-enter',animated);
 if(audioEntry==='intro'){
  audioSync=()=>{if(overlayVideo?.isConnected)titleAudio.syncIntroPosition(overlayVideo.currentTime);};
  const sync=()=>{if(view!=='title-page'||!overlayVideo?.isConnected){titleAudioSyncAnimation=0;return;}audioSync();titleAudioSyncAnimation=requestAnimationFrame(sync);};
  titleAudioSyncAnimation=requestAnimationFrame(sync);
 }else if(audioEntry==='skip')titleAudio.skipToTitle();
 else if(audioEntry!=='preserve')titleAudio.startTitle();
}
function renderIntro(){
 clearTimeout(introTimer);cancelAnimationFrame(introAnimation);cancelAnimationFrame(titleAudioSyncAnimation);titleAudioSyncAnimation=0;heading('','intro-page');const video=el('video');video.src='./intro.mp4';video.muted=true;video.playsInline=true;video.preload='metadata';video.controls=false;video.style.transition='none';introTimePosition=0;audioSync=()=>titleAudio.syncIntroPosition(video.isConnected?video.currentTime:introTimePosition);titleAudio.startIntro(0);
 let ended=false,titleStarted=false;
 const release=()=>{introTimePosition=video.currentTime;video.onended=null;video.onerror=null;video.pause();video.removeAttribute('src');video.load();video.remove();};
 const complete=()=>{if(ended)return;ended=true;clearTimeout(introTimer);cancelAnimationFrame(introAnimation);video.style.opacity='0';release();if(!titleStarted)renderTitle(true,null,'intro');};
 const finish=()=>{if(ended||!['intro-page','title-page'].includes(view))return;if(titleStarted){complete();return;}ended=true;clearTimeout(introTimer);cancelAnimationFrame(introAnimation);video.style.transition='opacity .65s';video.style.opacity='0';shell.classList.add('intro-fade');introTimer=setTimeout(()=>{release();renderTitle(true,null,'intro');},650);};
 const skip=()=>{if(ended||!['intro-page','title-page'].includes(view))return;ended=true;clearTimeout(introTimer);cancelAnimationFrame(introAnimation);release();renderTitle(true,null,'skip');shell.classList.add('title-skip-enter');};
 const tick=()=>{if(ended)return;if(!video.isConnected||!['intro-page','title-page'].includes(view)){ended=true;clearTimeout(introTimer);release();return;}introTimePosition=video.currentTime;titleAudio.syncIntroPosition(introTimePosition);const frame=introFrame(video.currentTime);video.style.opacity=String(frame.opacity);
  if(frame.titleVisible&&!titleStarted){titleStarted=true;renderTitle(true,video,'intro');video.play().catch(()=>complete());}
  if(frame.complete){complete();return;}introAnimation=requestAnimationFrame(tick);
 };
 video.onended=()=>{introFrame(video.currentTime).complete?complete():finish();};video.onerror=finish;shell.append(video,btn('건너뛰기',skip,'intro-skip'),audioToggle());introTimer=setTimeout(finish,120000);video.play().catch(()=>{message('영상을 재생하지 못했습니다. 건너뛰기로 계속할 수 있습니다.');});
 introAnimation=requestAnimationFrame(tick);
}
function renderSlots(){
 if(view!=='title-page')renderTitle();
 document.querySelector('.slot-dialog')?.close();
 const cards=el('div',null,'slot-list');
 const resume=(s,d)=>{d.close();slotId=s.slotId;monthOffset=0;roomLight.event('resume');previousRoomBackground=null;if(s.status==='PLAYING'){current().flags?.admissionPending?renderAdmission():renderRoom();}else renderCharacters(s.slotId,false);};
 let dialog;
 const cardFor=(s,recent=false)=>{
  const card=el('article',null,'slot-row'+(recent?' recent-slot':''));
  card.append(el('h3',(recent?'최근 저장 · ':'')+'슬롯 '+s.slotId));
  if(s.status==='EMPTY')card.append(el('p','저장 기록 없음'));
  else{
   const c=CHARACTERS.find(c=>c.id===s.activeRun?.characterId);card.append(el('p',s.status==='PLAYING'?(c?.name??'학생')+' · '+s.activeRun.runNumber+'회차 · '+s.activeRun.week+'주차':s.completedRunCount+'회차 완료'));
   card.append(btn(s.status==='PLAYING'?'이어서 하기':(s.completedRunCount+1)+'회차 시작',()=>resume(s,dialog)));
   if(!recent)card.append(btn('슬롯 삭제',()=>{
    modal('슬롯을 삭제할까요?',el('p','이 슬롯의 회차만 삭제합니다. 공용 메타는 유지됩니다.'),[btn('삭제',()=>{deleteSlot(profile,s.slotId);save(false,null);document.querySelector('dialog:not(.slot-dialog)')?.close();renderSlots();},'danger')]);
   },'text-button'));
  }
  return card;
 };
 const recent=recentSlot(profile);if(recent)cards.append(cardFor(recent,true));
 for(const s of profile.slots)cards.append(cardFor(s));
 dialog=modal('이어서 하기',cards,saveFailed?[btn('저장 다시 시도',()=>{save(true);renderSlots();})]:[]);
 dialog.classList.add('slot-dialog');dialog.querySelector('button')?.focus();
}
function renderEmptySlots(){
 if(saveFailed){message('저장 오류를 해결한 뒤 새 이야기를 시작해 주세요.');return;}
 const empty=firstEmptySlot(profile);if(!empty){message('빈 슬롯이 없습니다. 이어서 하기에서 기존 슬롯을 확인해 주세요.');return;}
 renderCharacters(empty.slotId,true);
}
function renderCharacters(id,isNew,gender='male',selectedId=null){
 heading('','character-select-page');
 const available=studentCards(profile.meta).filter(c=>c.gender===gender).sort((a,b)=>Number(b.selectable)-Number(a.selectable)),selected=available.find(c=>c.id===selectedId&&c.selectable)??available.find(c=>c.selectable);
 const layout=el('div',null,'character-catalogue'),list=el('section',null,'character-list-panel paper'),tabs=el('nav',null,'actions');list.append(el('h2','어떤 친구로 모험을 시작할까요?','character-selection-title'));
 for(const[value,label]of [['male','남성'],['female','여성']]){const b=btn(label,()=>renderCharacters(id,isNew,value),value===gender?'selected':'quiet');b.setAttribute('aria-pressed',String(value===gender));tabs.append(b);}list.append(tabs);
 const grid=el('div',null,'character-grid');
 const enlarge=c=>{const large=el('img',null,'enlarged-character');large.src='./character-assets/'+c.image.replace('1_base.png','0_fullbody.png');large.alt=c.name+' 전신';const d=modal(c.name+' · 전신 크게 보기',large);d.classList.add('character-preview-dialog');};
 for(const c of available){
  const card=el('article',null,'select-character-card'+(selected.id===c.id?' selected':''));
  const choose=btn('',()=>renderCharacters(id,isNew,gender,c.id),'character-card-select');choose.setAttribute('aria-label',c.name+' 선택');choose.setAttribute('aria-pressed',String(selected.id===c.id));
  const art=el('img');art.src='./character-assets/'+c.fullbody;art.alt=c.name;choose.append(art,el('strong',c.name));choose.disabled=!c.selectable;card.classList.toggle('locked-card',!c.selectable);if(!c.selectable){const lock=el('span','🔒','card-lock');lock.setAttribute('aria-label','미해금');card.append(lock);}
  const plus=btn('+',()=>enlarge(c),'card-plus');plus.setAttribute('aria-label',c.name+' 이미지 크게 보기');
  card.append(choose);if(c.selectable)card.append(plus);grid.append(card);
 }
 list.append(grid);const detail=el('aside',null,'character-detail-panel paper');
 const full=el('img',null,'selected-character-full');full.src='./character-assets/'+selected.image.replace('1_base.png','0_fullbody.png');full.alt=selected.name+' 전신';
 appendCharacterInfo(detail,selected,el);detail.append(el('small','기본 오픈 · 체력 100 · 성장 스탯 각 50'));
  const start=btn('시작하기',()=>{start.disabled=true;startRun(profile,id,selected.id);slotId=id;current().flags.admissionPending=true;monthOffset=0;save();if(saveFailed){renderRoom();return;}titleAudio.playMusic('admission',.9,{restart:true});blackDissolve(renderAdmission);});start.disabled=saveFailed;
 detail.append(start);layout.append(list,detail);shell.append(layout,btn('뒤로가기',isNew?()=>renderTitle(false,null,'preserve'):renderSlots,'text-button character-select-back'));
}
function renderAdmission(){
 titleAudio.playMusic('admission');heading('입학 초대장','admission-page');const c=CHARACTERS.find(c=>c.id===current().characterId);
 const letter=el('section',null,'invitation-letter');const art=img('ui','UI07_admission_invitation_004.png','','invitation-art');art.onload=()=>{letter.style.aspectRatio=art.naturalWidth+'/'+art.naturalHeight;};letter.append(art);
 const copy=el('div',null,'invitation-copy');invitationLines(c.name).forEach((text,i)=>copy.append(el(i===0?'h2':'p',text)));copy.append(btn('입학하기',()=>renderAdmissionScene(0)));letter.append(copy);shell.append(letter);
}
function finishAdmissionPreview(){if(current().flags?.admissionPending)current().flags.admissionPending=false;renderRoom();}
let admissionLog=[];
const PREVIEW_ADMISSION=['아르카디아에 도착했어. 이곳에서는 어떤 하루를 만나게 될까?','시계탑 광장에 온 것을 환영합니다. 입학 안내를 함께 확인해 볼까요?','시계탑의 룬이 조금 어둡게 보이네요. 무슨 일이 있는 걸까요?','선생님들이 룬을 살펴보고 계십니다. 아직 원인은 확인되지 않았어요.','이제 방에서 일정을 계획해 보세요. 수업과 모험, 휴식을 선택할 수 있습니다.'];
function renderAdmissionScene(index){
 const scene=ADMISSION_SCENES[index];heading(scene.title,'admission-story-page');
 if(index===0)admissionLog=[];const line=PREVIEW_ADMISSION[index];admissionLog=admissionLog.filter(x=>x.index<index);admissionLog.push({index,text:line});const nav=el('nav',null,'story-top-controls');nav.append(btn('대화기록',()=>{const history=el('div');for(const entry of admissionLog)history.append(el('p','[임시 대사] '+entry.text));modal('입학 대화기록 · 시안',history);},'text-button'),btn('건너뛰기',finishAdmissionPreview,'text-button'));shell.append(nav);
 const c=CHARACTERS.find(c=>c.id!==current().characterId);const npc=el('img',null,'npc-dialogue-image');npc.src='./character-assets/'+c.image;npc.alt=c.name+' · 임시 NPC';shell.append(npcStage(npc));
 const frame=el('section',null,'paper life-dialogue');frame.append(el('small','MS01 · '+(index+1)+' / '+ADMISSION_SCENES.length+' · 임시 대사 / 정식 원고 아님'),el('h2',c.name+' · 임시 NPC / 정식 캐스팅 아님'),el('p',line,'dialogue-text'),el('small',scene.title+' · 스토리 완료·보상 반영 없음'));
 const actions=el('nav',null,'actions');actions.append(btn('이전',()=>index?renderAdmissionScene(index-1):renderAdmission(),'quiet'),btn(index+1===ADMISSION_SCENES.length?'마이룸으로':'다음 장면',()=>index+1===ADMISSION_SCENES.length?finishAdmissionPreview():renderAdmissionScene(index+1)));
 frame.append(actions);shell.append(frame);
}
const journalUI=createJournalUI({el,btn,shell,heading,current,meta:()=>profile.meta,activePet:()=>activePet(profile),onSelectPet:selectPet,isSaveFailed:()=>saveFailed,onReturn:renderRoom,turnPage:(_layout,done)=>done()});
function completeActivity(token,result){
 const applied=applyAction(profile,slotId,token,result);
 if(applied)roomLight.event('complete');renderRoom();
 message(applied?activityResultText(current().actionHistory.at(-1)):'오늘 일정은 유지됩니다.');
 return applied;
}
const endingUI=createEndingUI({el,btn,shell,heading,current,character:()=>CHARACTERS.find(c=>c.id===current().characterId),slotId:()=>slotId,onReturn:renderRoom});
const roomUI=createMyroomUI({el,btn,img,shell,heading,current,characters:CHARACTERS,emptyFrame,message,menu,decorateRoom,onDiary:()=>journalUI.diary(),onBag:()=>journalUI.bag(),onAdmission:renderAdmission,onPet:()=>journalUI.bag('펫'),activePet:()=>activePet(profile),meta:()=>profile.meta,isSaveFailed:()=>saveFailed,
 onAdventure:renderAdventure,onCommit:schedule=>{roomLight.event('start');setSchedule(profile,slotId,schedule);},onRetry:()=>save(true),
 onFinish:()=>{finishWeek(profile,slotId);roomLight.event('next-day');save();renderRoom();},onEnding:()=>endingUI.render(),
 onAction:()=>{roomLight.event('start');const run=current(),action=currentAction(run),lesson=classOf(action),token=actionToken(run);
 if(action==='adventure'){renderAdventure();}
 else if(lesson){pending={slotId,token};shell.hidden=true;document.querySelector('#game').hidden=false;
  const startData=createMinigameStartData({gameId:lesson.id,locationId:lesson.locationId,statValue:run.stats[lesson.stat],
   seed:`run-${run.runNumber}-${run.week}-${run.day}`,maxDurationMs:180000,rewardInputs:null});
  game.scene.start(lesson.id,startData);}
 else{completeActivity(token);}}
});
function renderRoom(){titleAudio.playMusic('room');roomUI.room();}
function renderAdventure(){
 const token=actionToken(current());heading('유리 온실','adventure-page');
 const host=el('div',null,'adventure-viewport');host.setAttribute('aria-label','SD 캐릭터 모험 맵');shell.append(host);
 let ready=false;const nav=el('nav',null,'adventure-tools');
 const finish=btn('오늘 모험 마치기',()=>{if(ready)completeActivity(token,{gameId:'adventure',outcome:'complete'});});finish.disabled=true;
 nav.append(finish,btn('중단 · 마이룸으로',()=>{completeActivity(token,{gameId:'adventure',outcome:'quit'});message('모험을 중단했습니다. 날짜·체력·일정은 유지됩니다.');}));shell.append(nav);
 const pad=el('nav',null,'adventure-pad');pad.setAttribute('aria-label','모험 방향 조작');
 for(const [label,x,y] of [['↑',0,-1],['←',-1,0],['↓',0,1],['→',1,0]]){
  const b=btn(label,()=>{});b.setAttribute('aria-label','이동 '+label);
  b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);adventureView?.direction(x,y);};
  const stop=()=>adventureView?.direction(0,0);b.onpointerup=stop;b.onpointercancel=stop;b.onlostpointercapture=stop;pad.append(b);
 }shell.append(pad);
 adventureView=mountAdventure(host,(text,isReady=false)=>{ready=isReady;finish.disabled=!ready;message(text);});
}
class HomeScene extends Phaser.Scene{
 constructor(){super('home');}
 preload(){this.load.image('myroom','./world-assets/BG03_myroom1_day_1920x1080_012.png');for(const[id,s]of Object.entries(SPACES))this.load.image('space-'+id,'./world-assets/'+s.image);}
 create(){}
}
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1280,height:720,backgroundColor:'#142a37',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[HomeScene,...previewScenes]});
function receive(result){if(!pending)return;const item=pending;pending=null;slotId=item.slotId;try{completeActivity(item.token,result);}catch(e){renderRoom();message(e.message);}}
game.events.on('minigame:complete',receive);game.events.on('minigame:quit',receive);
try{repository=createLocalRepository(window.localStorage);profile=repository.load();writer=createBoundaryWriter(repository);}catch(e){message('저장 데이터를 읽지 못했습니다. 원본을 보존합니다. '+e.message);}
document.fonts.load('18px "Gowun Batang"').catch(()=>message('폰트를 불러오지 못해 기본 글꼴로 표시합니다.'));
// Browsers may restrict orientation locking to fullscreen or installed apps.
// Request it silently at entry and retry on gestures/fullscreen changes.
const landscapeDevice=matchMedia('(pointer:coarse)');
let orientationPending=false;
async function lockLandscape(fromGesture=false){
 if(!landscapeDevice.matches||orientationPending||!screen.orientation?.lock)return;
 orientationPending=true;
 try{
  if(fromGesture&&!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});
  await screen.orientation.lock('landscape');
 }catch{}finally{orientationPending=false;}
}
lockLandscape();
window.addEventListener('pointerdown',()=>lockLandscape(true),{passive:true});
document.addEventListener('fullscreenchange',()=>lockLandscape());
renderIntro();
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&view==='room-page'&&!document.querySelector('dialog[open]'))menu();});
window.addEventListener('beforeunload',e=>{if(saveFailed||profile?.slots.some(s=>s.activeRun&&['ACTING','WEEK_COMPLETE'].includes(s.activeRun.phase))){e.preventDefault();e.returnValue='';}});
