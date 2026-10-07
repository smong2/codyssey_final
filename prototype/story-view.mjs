import {objectiveId} from './state.mjs';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const button=(label,action,cls='primary',extra='')=>`<button class="${cls}" data-action="${action}" ${extra}>${esc(label)}</button>`;
export const textFor=(text,s)=>String(text??'').replaceAll('{characterName}',s.selectedCharacterName??'카엘');
export const image=(c,id,cls='',alt='')=>`<img class="${cls}" src="${esc(c.assets[id])}" alt="${esc(alt)}" data-asset="${esc(id)}">`;
const roomTools=()=>`<nav class="room-tools" aria-label="방에서 보기">${button('가방','bag','ghost')}${button('다이어리','diary','ghost')}</nav>`;
export function dialogueLines(s,c,ui={}){
 if(s.scene==='greenhouse'&&s.restored)return c.dialogue.greenhouse.slice(-2);
 if(s.scene==='choiceReaction'){const ch=c.choices.find(x=>x.id===s.choice);return [{speaker:'{characterName}',portrait:'kael',text:ch.label},...ch.reaction.map(text=>({speaker:'시온',portrait:'sion',text}))];}
 if(s.scene==='bernTalkReaction'){const ch=c.bernTalk.choices.find(x=>x.id===ui.smallChoice);return ch?[{speaker:'{characterName}',portrait:'kael',text:ch.player},...ch.reaction.map((text,i)=>({speaker:'베른',portrait:'bern',text,note:i===0?ch.reactionNote:null}))]:[];}
 return c.dialogue[s.scene]??[];
}
function shell(s,c,bg,body,label='',cls='',menu=true){
 const room=bg==='room';const style=bg?`style="background-image:url('${esc(c.assets[bg])}')"`:'';
 return `<main class="screen ${cls} ${room?'room-'+s.timeOfDay:''} ${s.restored&&bg==='greenhouse'?'greenhouse-recovered':''}" ${style}>${room?'<div class="room-light" aria-hidden="true"></div>':''}${menu?`<header class="topbar"><span class="location">${esc(label)}</span>${button('메뉴','menu','ghost')}</header>`:''}${body}</main>`;
}
function portraits(s,c,npc,speaking=''){
 const port=(id,side)=>{const flip=c.presentation[id]?.flip;return `<div class="portrait-${side} ${speaking===id?'speaking':'listening'}"><div class="portrait-image ${flip?'flipped':''}">${image(c,id,'',id==='kael'?s.selectedCharacterName??'카엘':{sion:'시온',valentinus:'발렌티누스',bern:'베른'}[id])}</div></div>`;};
 return port('kael','left')+port(npc,'right');
}
const npcFor=scene=>['valentinus'].includes(scene)?'valentinus':['sion','greenhouse','reaction','choice','choiceReaction'].includes(scene)?'sion':'bern';
const placeFor=scene=>['valentinus','sion'].includes(scene)?'시계탑 광장':['greenhouse','reaction','choice','choiceReaction'].includes(scene)?'유리 온실':'My Room';
const bgFor=scene=>['valentinus','sion'].includes(scene)?'plaza':['greenhouse','reaction','choice','choiceReaction'].includes(scene)?'greenhouse':'room';
export function recordBody(s,c,record){
 const choice=record?.choiceText??c.choices.find(x=>x.id===s.choice)?.label??'';
 const reflection=record?.reflectionText??c.reflections.find(x=>x.id===s.reflection)?.label??'';
 return `<div class="eyebrow">오늘의 이야기</div><h2>EPISODE 1 · ${esc(c.title)}</h2><div class="memory-art" style="background-image:url('${esc(c.assets.greenhouse)}')"></div>${c.record.summary.map(p=>`<p>${esc(p)}</p>`).join('')}<h3>내가 건넨 말</h3><p>${esc(choice)}</p><h3>마음에 남은 장면</h3><p>${esc(reflection)}</p>`;
}
export function renderStory(s,c,chars,ui={}){
 switch(s.scene){
 case 'entry':return shell(s,c,'entrance',`<div class="intro-center">${button(c.copy.entryStart,'start-entry')}</div>`,'','entry',false);
 case 'awakening':return shell(s,c,null,`<video id="intro-video" playsinline muted preload="metadata" poster="${esc(c.assets.entrance)}"><source src="${esc(c.intro.video)}" type="video/mp4"></video><div class="intro-fallback" hidden><div class="intro-rune">◇</div><p>${esc(c.copy.awakening)}</p></div>${button('건너뛰기','skip-intro','ghost intro-skip')}`,'','awakening',false);
 case 'reveal':return shell(s,c,'entrance','<div class="reveal-light" aria-hidden="true"></div>','','reveal',false);
 case 'title':return shell(s,c,'entrance',`<section class="main-title"><h1>LUMIA</h1><div class="title-actions">${ui.saved?.characterConfirmed?button(c.copy.continue,'continue')+button(c.copy.newStory,'new','ghost'):button(c.copy.start,'new')}${ui.loadError?button('다시 시도하기','retry-load','ghost'):''}</div>${button('돌아가기','replay-intro','ghost title-back')}${ui.loadError?`<p role="alert">${esc(ui.loadError)}</p>`:''}</section>`,'','title',false);
 case 'select':{
  const selected=chars.find(x=>x.id===ui.selected)??chars[0],gender=ui.gender??'male';
  return shell(s,c,'entrance',`<section class="catalogue"><h2>${esc(c.copy.select)}</h2><div class="catalogue-layout"><section class="catalogue-list"><nav class="gender-tabs" aria-label="캐릭터 목록">${[['male','남성'],['female','여성']].map(([id,name])=>button(name,'gender',id===gender?'primary':'ghost',`data-id="${id}" aria-pressed="${id===gender}"`)).join('')}</nav><div class="character-grid">${chars.filter(x=>x.gender===gender).map(x=>`<article class="character-card ${selected.id===x.id?'selected':''}"><img class="card-background" src="${esc(c.assets.cardBackground)}" alt=""><button class="card-select" data-action="card" data-id="${x.id}" aria-pressed="${selected.id===x.id}" aria-label="${esc(x.name)} 카드"><img src="${esc(x.thumbnail??x.asset)}" alt="${esc(x.name)}" loading="lazy" decoding="async"><span>${esc(x.name)}</span></button><img class="card-frame" src="${esc(c.assets.cardFrame)}" alt=""><button class="card-plus" data-action="enlarge" data-id="${x.id}" aria-label="${esc(x.name)} 이미지 크게 보기">+</button></article>`).join('')}</div></section><aside class="character-detail"><h1>${esc(selected.name)}</h1><p>${selected.age}세 · ${esc(selected.title)}</p><dl><dt>성격</dt><dd>${esc(selected.personality)}</dd><dt>배경</dt><dd>${esc(selected.background)}</dd><dt>강점</dt><dd>${esc(selected.strength)}</dd><dt>어려워하는 것</dt><dd>${esc(selected.difficulty)}</dd></dl><blockquote>“${esc(selected.quote)}”</blockquote><div class="choice-list">${selected.playable?button('이 캐릭터로 시작하기','confirm-character','primary',`data-id="${selected.id}"`):''}</div></aside></div></section>`,'','select-screen');
 }
 case 'admission':return shell(s,c,'entrance',`<div class="center-panel"><section class="invitation original-invitation">${image(c,'invitation','invitation-art','')}<div class="invitation-copy">${c.copy.admission.map((p,i)=>i===0?`<h2>${esc(textFor(p,s))}</h2>`:`<p>${esc(p)}</p>`).join('')}${button(c.copy.admissionAction,'admission-next')}</div></section></div>`,'입학 초대장');
 case 'arrivalTransition':return shell(s,c,'plaza','<div class="transition-light"><div class="intro-rune">◇</div></div>','','arrival-transition',false);
 case 'plazaArrival':return shell(s,c,'plaza','<div class="intro-center arrival-label"><p>아르카디아</p><h2>시계탑 광장</h2></div>','','',false);
 case 'episodeTitle':return shell(s,c,null,`<div class="intro-center"><p>EPISODE 1</p><h1>${esc(c.title)}</h1></div>`,'','episode-title',false);
 case 'room':return shell(s,c,'room',`${roomTools()}<div class="intro-center"><p>${esc(c.copy.roomArrival)}</p>${button('베른과 이야기하기','room-next')}</div>`,'My Room');
 case 'reflection':return shell(s,c,'room',`${roomTools()}${portraits(s,c,'bern','kael')}<section class="safe-choices"><h2>오늘 어떤 장면이 가장 기억에 남나요?</h2><div class="choice-list">${c.reflections.map(x=>button(x.label,'reflect','',`data-id="${x.id}"`)).join('')}</div></section><section class="life-dialogue choice-context"><div class="speaker">베른</div><p>오늘 어떤 장면이 가장 기억에 남나요?</p></section>`,'My Room');
 case 'record':return shell(s,c,'room',`${roomTools()}<div class="center-panel"><section class="paper-panel">${recordBody(s,c)}${button('다이어리에 남기기','save-diary')}</section></div>`,'My Room');
 case 'diarySaved':return shell(s,c,'room',`<div class="center-panel"><section class="paper-panel"><h2>${esc(c.copy.diarySaved)}</h2><div class="diary-card"><small>EP.01</small><h3>${esc(c.title)}</h3></div>${button('이야기 마무리하기','claim-reward')}</section></div>`,'My Room');
 case 'reward':return shell(s,c,'room',`<div class="center-panel"><section class="paper-panel reward-panel"><h2>${esc(c.copy.reward)}</h2><p class="heart-reward">♥ +100</p><p>현재 보유 하트 ♥ ${s.heartBalance}</p>${button('확인','reward-next')}</section></div>`,'My Room');
 case 'heartIntro':return shell(s,c,'room',`<div class="center-panel"><section class="paper-panel">${c.copy.heartIntro.map((p,i)=>i===0?`<h2>${esc(p)}</h2>`:`<p>${esc(p)}</p>`).join('')}${button('방으로 돌아가기','heart-intro-next')}</section></div>`,'My Room');
 case 'roomFree':case 'morning':{
  const morning=s.scene==='morning';return shell(s,c,'room',`<div class="room-furniture">${image(c,'desk')}${image(c,'lamp')}</div><div class="room-bern">${image(c,'bern','','베른')}</div><div class="room-status"><h2>My Room</h2><p>${morning?'다음 날 아침':'첫날 저녁'}</p><p class="heart-balance">♥ ${s.heartBalance}</p></div><nav class="free-room-tools">${button('가방','bag')}${button('다이어리','diary')}${morning?'':button('베른과 이야기하기','bern-talk')}${morning?'':button('오늘을 마무리하기','end-day','primary',s.dayEndUnlocked?'':'disabled')}</nav>${morning?'<aside class="prototype-end" aria-label="개발용 종료 표시">Prototype End · 다음 날 아침까지의 이야기를 마쳤습니다.</aside>':s.dayEndUnlocked?'':'<p class="locked-day">오늘의 기록을 먼저 남겨 보세요.</p>'}`,'My Room');
 }
 case 'dayEnd':return shell(s,c,'room',`<div class="intro-center"><p>${esc(c.copy.dayEnd)}</p><p>${esc(c.copy.nextDay)}</p></div>`,'','day-end',false);
 case 'choice':case 'bernTalkChoice':{
  const small=s.scene==='bernTalkChoice',choices=small?c.bernTalk.choices:c.choices,bg=small?'room':'greenhouse';
  return shell(s,c,bg,`${small?roomTools():''}${portraits(s,c,small?'bern':'sion','kael')}<section class="safe-choices"><h2>${small?'지금은 뭘 하고 싶나요?':'시온에게 어떤 말을 할까?'}</h2><div class="choice-list">${choices.map(x=>button(x.label,small?'small-choice':'choose','',`data-id="${x.id}"`)).join('')}</div></section><section class="life-dialogue choice-context"><div class="speaker">${small?'베른':'시온'}</div><p>${small?'지금은 뭘 하고 싶나요?':'혼날까 봐 겁이 났어.'}</p></section>`,small?'My Room':'유리 온실');
 }
 case 'adventure':return shell(s,c,null,`<div class="game-wrap" id="game"></div><aside class="objective"><p id="objective">${esc(c.objectives[objectiveId(s)])}</p></aside><aside class="knowledge-panel"><h3>알아낸 것</h3><div id="knowledge">${knowledgeBody(s,c)}</div></aside><nav class="tools" aria-label="탐험 도구">${button('가방','bag','tool')}${button('힌트','hint','tool')}</nav><div class="controls desktop-controls">방향키 / WASD 이동 · E 살펴보기</div><div class="touch-joystick" role="group" aria-label="이동 조이스틱"><span class="joystick-knob"></span></div><button class="interact" data-action="interact" hidden>E 살펴보기</button>`,'유리 온실','adventure-screen');
 default:{
  const lines=dialogueLines(s,c,ui),line=lines[Math.min(s.node,lines.length-1)];if(!line)return '';
  const final=s.node>=lines.length-1,labels={greenhouse:'온실 살펴보기',reaction:'시온에게 답하기',bern:'오늘 돌아보기',bernRepeat:'대화 마치기',bernTalkReaction:'대화 마치기',morningIntro:'아침 맞이하기'};
  const room=bgFor(s.scene)==='room';return shell(s,c,bgFor(s.scene),`${room?roomTools():''}${portraits(s,c,npcFor(s.scene),line.portrait)}${s.scene==='morningIntro'?`<p class="morning-copy">${esc(c.copy.morning)}</p>`:''}<section class="life-dialogue" aria-live="polite" ${final&&labels[s.scene]?'':'data-action="next" role="button" tabindex="0" aria-label="대화 진행"'}><div class="speaker">${esc(textFor(line.speaker,s))}</div>${line.note?`<small class="expression-note">${esc(line.note)}</small>`:''}<p class="dialogue-text">${esc(textFor(line.text,s))}</p><div class="dialogue-actions">${final&&labels[s.scene]?button(labels[s.scene],'next'):'<span class="progress-arrow" aria-hidden="true">▸</span>'}</div></section>`,placeFor(s.scene));
 }
 }
}
export function knowledgeBody(s,c){return s.knowledge.length?`<ul>${s.knowledge.map(id=>`<li>${esc(c.knowledge[id].fact)}</li>`).join('')}</ul>`:'<p>아직 알아낸 것이 없어요.</p>';}
