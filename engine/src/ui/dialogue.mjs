import {createDialoguePlayback,toFullbodyCharacterSrc} from '../core/dialogue-playback.mjs';
import {STUDENTS} from '../core/catalogue.mjs';

const displayText=(mode,text)=>{
 if(mode==='NARRATION'||mode==='CONTEXT')return `[${text}]`;
 if(mode==='THOUGHT')return `'${text}'`;
 return text;
};
export function createStoryResultUI({el,btn}){
 let panel=null;
 const clear=()=>{panel?.remove();panel=null;};
 return {clear,show(target,{completionMode,visibleStatDelta={}},next){
  clear();const names={knowledge:'지식',expression:'표현력',skill:'솜씨',dexterity:'솜씨',exploration:'탐험',magic:'마법'};
  const rows=Object.entries(visibleStatDelta).filter(([key,value])=>Object.hasOwn(names,key)&&Number.isFinite(value)&&value>0&&value<=500);
  if(completionMode==='SKIP'||!rows.length){next();return;}
  panel=el('dialog',null,'collection-result-overlay');panel.setAttribute('aria-label','이야기 완료');panel.addEventListener('cancel',event=>event.preventDefault());
  const content=el('section',null,'paper collection-result story-result');
  content.append(el('h2','이야기를 마쳤어요'));for(const [key,value]of rows)content.append(el('p',names[key]+' +'+value));
  let done=false;content.append(btn('계속',()=>{if(done)return;done=true;clear();next();}));panel.append(content);target.append(panel);panel.showModal();
 }};
}

export function createDialogueUI({el,btn,shell,heading,modal,getRoomBackground=()=>null}){
 let clearCurrent=()=>{};
 return {render({payload,onComplete=()=>{},onSkip=()=>{},onSceneChange=()=>{},extraControls=[],pageClassName='dialogue-preview-page'}){
  clearCurrent();
  const playback=createDialoguePlayback(payload),log=[];
  let completed=false,disposed=false,backgroundImage=null,focusImage=null,focusAnimation=null,nameplateVisible=false,nameplateAnimation=null,lastLine=null,loggedBackground=null,sceneCount=0,lastSceneId=null;
  const animations=new Set(),backgroundLayers=new Set();
  const animate=(target,keyframes,options,done=()=>{})=>{
   if(disposed)return null;
   if(typeof target.animate!=='function'||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){done();return null;}
   const animation=target.animate(keyframes,{...options,fill:'both'});animations.add(animation);
   animation.onfinish=()=>{animation.onfinish=null;animations.delete(animation);animation.cancel();if(!disposed)done();};
   return animation;
  };
  clearCurrent=()=>{
   disposed=true;
   for(const animation of animations){animation.onfinish=null;animation.cancel();}
   animations.clear();
   for(const image of backgroundLayers){image.onload=null;image.onerror=null;}
  };
  heading('',pageClassName);
  shell.classList?.toggle('dialogue-layout',true);
  const controls=el('nav',null,'story-top-controls');
  controls.append(btn('대화기록',()=>{
   const body=el('div',null,'dialogue-history');
   if(log.length===0)body.append(el('p','아직 대화가 없습니다.'));
   let section=body;
   for(const entry of log){
    if(entry.type==='scene'){
     section=el('section',null,'dialogue-history-scene');
     body.append(section);
     continue;
    }
    const kind=entry.type==='choice'?'choice':entry.mode.toLowerCase();
    const row=el('article',null,'dialogue-history-entry dialogue-history-entry--'+kind);
    const label=entry.type==='choice'?'선택':entry.speaker??(entry.mode==='CONTEXT'?'배경 설명':'상황 설명');
    row.append(el('strong',label,'dialogue-history-speaker'),el('p',entry.text,'dialogue-history-text'));
    section.append(row);
   }
   const popup=modal('대화기록',body);popup?.classList?.toggle('dialogue-history-modal',true);
  },'text-button'));
  controls.append(...extraControls);
  if(payload.canSkip===true)controls.append(btn('건너뛰기',()=>{
   if(completed)return;completed=true;
   clearCurrent();
   onSkip({completionMode:'SKIP',selectedChoices:playback.snapshot().selectedChoices});
  },'text-button'));
  shell.append(controls);
  const stage=el('div',null,'dialogue-stage');shell.append(stage);
  const choiceLayer=el('div',null,'dialogue-choice-layer');choiceLayer.hidden=true;shell.append(choiceLayer);
  const frame=el('section',null,'paper life-dialogue');
  shell.append(frame);
  const nameplate=el('div',null,'dialogue-speaker-nameplate dialogue-speaker-nameplate--overlap');
  nameplate.style.backgroundImage='url("./design-assets/ui/BT04_blank_pale_green_short.png")';
  nameplate.hidden=true;
  shell.append(nameplate);
  const complete=()=>{
   if(completed)return;completed=true;
   clearCurrent();
   onComplete({completionMode:'COMPLETE',selectedChoices:playback.snapshot().selectedChoices});
  };
  shell.onclick=event=>{
   if(completed||disposed)return;
   if(event.target?.closest?.('button,a,input,select,textarea'))return;
   const current=playback.snapshot().node;
   if(current.type==='LINE'){playback.next();if(playback.snapshot().node.type==='END'){complete();return;}paint();return;}
   if(current.type==='END')complete();
  };
  const syncNameplate=speaker=>{
   const visible=!!speaker?.name;
   if(visible===nameplateVisible){
    if(visible)nameplate.replaceChildren(el('span',speaker.name,'dialogue-speaker-nameplate-text'));
    return;
   }
   nameplateVisible=visible;
   if(nameplateAnimation){nameplateAnimation.onfinish=null;nameplateAnimation.cancel();animations.delete(nameplateAnimation);nameplateAnimation=null;}
   if(visible){
    nameplate.hidden=false;
    nameplate.replaceChildren(el('span',speaker.name,'dialogue-speaker-nameplate-text'));
    nameplateAnimation=animate(nameplate,[{opacity:0,transform:'translate(-32px, -50%)'},{opacity:1,transform:'translate(0, -50%)'}],{duration:260,easing:'ease-out'});
   }else{
    nameplateAnimation=animate(nameplate,[{opacity:1,transform:'translate(0, -50%)'},{opacity:0,transform:'translate(-32px, -50%)'}],{duration:220,easing:'ease-in'},()=>{
     if(!nameplateVisible){nameplate.hidden=true;nameplate.replaceChildren();}
    });
   }
  };
  const syncBackground=entry=>{
   const assetPath=src=>typeof src==='string'?src.replace(/^\.\//,'/').split(/[?#]/)[0]:null;
   const roomBackground=assetPath(getRoomBackground());
   const isRoomBackground=!!roomBackground&&assetPath(entry?.src)===roomBackground;
   stage.classList?.toggle('dialogue-room-background',isRoomBackground);
   if(!entry){
    backgroundImage=null;
    for(const image of backgroundLayers){image.onload=null;image.onerror=null;image.remove();}
    backgroundLayers.clear();return;
   }
   if(backgroundImage?._dialogueSource===entry.src)return;
   if([...backgroundLayers].some(image=>image.style.opacity==='1')){
    for(const pending of backgroundLayers){
     if(pending.style.opacity==='0'){pending.onload=null;pending.onerror=null;pending.remove();backgroundLayers.delete(pending);}
    }
   }
   const image=el('img',null,'dialogue-background');image.alt=entry.alt??'';
   image.classList?.toggle('dialogue-background-room',isRoomBackground);
   image._dialogueSource=entry.src;image.style.opacity='0';
   backgroundImage=image;backgroundLayers.add(image);stage.append(image);
   image.onload=()=>{
    if(disposed||!backgroundLayers.has(image))return;
    image.onload=null;image.style.opacity='1';
    // A previous loader can still be a useful fallback while the latest scene loads.
    if(image!==backgroundImage)return;
    animate(image,[{opacity:0},{opacity:1}],{duration:600,easing:'ease-in-out'},()=>{
     if(image!==backgroundImage)return;
     for(const previous of backgroundLayers){
      if(previous!==image){previous.onload=null;previous.onerror=null;previous.remove();backgroundLayers.delete(previous);}
     }
    });
   };
   image.onerror=()=>{
    if(disposed||image!==backgroundImage)return;
    image.onload=null;image.remove();backgroundLayers.delete(image);
    backgroundImage=[...backgroundLayers].reverse().find(previous=>previous.style.opacity==='1')??[...backgroundLayers].at(-1)??null;
   };
   image.src=entry.src;
  };
  const syncFocus=entry=>{
   if(!entry){
    if(focusAnimation){focusAnimation.onfinish=null;focusAnimation.cancel();animations.delete(focusAnimation);focusAnimation=null;}
    if(focusImage){focusImage.onload=null;focusImage.onerror=null;focusImage.remove();focusImage=null;}return;
   }
   if(!focusImage){focusImage=el('img',null,'dialogue-focus dialogue-focus-centered');stage.append(focusImage);}
   const image=focusImage;
   image.classList?.toggle('dialogue-focus-choice',playback.snapshot().node.type==='CHOICE');
   image.classList?.toggle('dialogue-focus-object',entry.assetType!=='CHARACTER');
   if(image._dialogueSource!==entry.src){
    if(focusAnimation){focusAnimation.onfinish=null;focusAnimation.cancel();animations.delete(focusAnimation);}
    image.onload=null;image.onerror=null;image.style.opacity='0';image._dialogueSource=entry.src;
    const source=entry.src;
    image.onload=()=>{
     if(disposed||focusImage!==image||image._dialogueSource!==source)return;
     image.onload=null;image.onerror=null;
     focusAnimation=animate(image,[{opacity:0,transform:'translateX(calc(-50% - 28px))'},{opacity:1,transform:'translateX(-50%)'}],{duration:340,easing:'ease-out'},()=>{if(focusImage===image&&image._dialogueSource===source)image.style.opacity='1';});
    };
    image.onerror=()=>{
     if(focusImage!==image||image._dialogueSource!==source)return;
     image.onload=null;image.onerror=null;image.style.opacity='0';
    };
    image.src=source;
   }
   image.alt=entry.alt??'';
  };
  const paint=()=>{
   if(disposed)return;
   const state=playback.snapshot(),current=state.node;
   if(!state.ended&&state.sceneId&&state.sceneId!==lastSceneId){
    lastSceneId=state.sceneId;onSceneChange({storyId:payload.storyId,eventId:payload.eventId,sceneId:state.sceneId});
   }
   if(current.type==='LINE'||current.type==='CHOICE'){
    const background=state.background?.src??null;
    if(sceneCount===0||background!==loggedBackground){
     loggedBackground=background;sceneCount++;
     log.push({type:'scene'});
    }
   }
   syncBackground(state.background);syncFocus(state.focus);
   frame.replaceChildren();
   choiceLayer.replaceChildren();choiceLayer.hidden=current.type!=='CHOICE';
   frame.hidden=false;
   stage.classList?.toggle('dialogue-choice-active',current.type==='CHOICE');
   if(current.type==='LINE')lastLine=current;
   const shownLine=current.type==='LINE'?current:current.type==='CHOICE'?lastLine:null;
   const mode=shownLine?.lineMode??'DIALOGUE',lineSpeaker=shownLine?payload.speakers[shownLine.speaker]:null;
   const speaker=shownLine&&['DIALOGUE','THOUGHT'].includes(mode)?lineSpeaker:null;
   syncNameplate(speaker);
   const player=lineSpeaker?.kind==='PLAYER'&&['DIALOGUE','THOUGHT'].includes(mode)?lineSpeaker:null;
   const playerArt=player?.portraitSrc||(player?STUDENTS.find(student=>student.id===player.id)?.fullbody:null);
   const playerSrc=playerArt?(player?.portraitSrc?toFullbodyCharacterSrc(playerArt):'./character-assets/'+playerArt):null;
   frame.classList?.toggle('dialogue-has-player',!!playerSrc);
   if(payload.previewOnly===true)frame.append(el('small',payload.previewNotice??'연결 확인용 임시 원고 · 정식 시나리오·보상 아님','dialogue-preview-notice'));
   const actions=el('nav',null,'actions dialogue-actions');
   const shownText=shownLine?displayText(mode,shownLine.text):current.type==='CHOICE'?current.prompt:null;
   if(shownText){
    frame.append(el('p',shownText,'dialogue-text'+(current.type==='CHOICE'?' dialogue-choice-question':'')));
    if(playerSrc){
     const portrait=el('figure',null,'dialogue-player-portrait');portrait.setAttribute('aria-label',player.name+' 얼굴');
     const crop=el('div',null,'dialogue-player-portrait-crop'),face=el('img');
     face.src=playerSrc;face.alt=player.name;
     crop.append(face);portrait.append(crop);frame.append(portrait);
    }
   }
   if(current.type==='LINE'){
    log.push({type:'line',mode,speaker:speaker?.name??null,text:shownText});
    const indicator=el('span',null,'dialogue-advance-indicator');indicator.setAttribute('aria-hidden','true');
    const arrow=el('img');arrow.src='./design-assets/ui/UI24_journal_arrow_down.png';arrow.alt='';indicator.append(arrow);
    frame.append(indicator);
   }else if(current.type==='CHOICE'){
    const choices=el('nav',null,'dialogue-choice-panel-right');
    for(const option of current.options)choices.append(btn(option.text,()=>{
     log.push({type:'choice',text:option.text});playback.choose(current.choiceNodeId,option.choiceId);if(playback.snapshot().node.type==='END')complete();else paint();
    },'dialogue-choice dialogue-choice-nameplate'));
    for(const option of choices.children){
     const tag=(option.tagName??option.tag??'').toLowerCase();
     if(tag!=='p')option.style.backgroundImage='url("./design-assets/ui/BT04_choice_blank_pale_ivory.png")';
    }
    choiceLayer.append(choices);
   }else{
    complete();
   }
   if(actions.children?.length)frame.append(actions);
  };
  paint();
 }};
}
