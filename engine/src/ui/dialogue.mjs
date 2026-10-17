import {createDialoguePlayback} from '../core/dialogue-playback.mjs';

const lineLabels={DIALOGUE:'대화',NARRATION:'장면',THOUGHT:'속마음',CONTEXT:'기억'};

export function createDialogueUI({el,btn,shell,heading,modal}){
 return {render({payload,onComplete=()=>{},onSkip=()=>{},extraControls=[],pageClassName='dialogue-preview-page'}){
  const playback=createDialoguePlayback(payload),log=[];let completed=false,backgroundImage=null,focusImage=null,activeSpeaker=null;
  heading('',pageClassName);
  const controls=el('nav',null,'story-top-controls');
  controls.append(btn('대화기록',()=>{
   const body=el('div',null,'dialogue-history');
   if(log.length===0)body.append(el('p','아직 대화가 없습니다.'));
   for(const entry of log)body.append(el('p',entry));
   modal('대화기록',body);
  },'text-button'));
  controls.append(...extraControls);
  if(payload.canSkip===true)controls.append(btn('건너뛰기',()=>{
   if(completed)return;completed=true;
   onSkip({completionMode:'SKIP',selectedChoices:playback.snapshot().selectedChoices});
  },'text-button'));
  shell.append(controls);
  const stage=el('div',null,'dialogue-stage');shell.append(stage);
  const choiceLayer=el('div',null,'dialogue-choice-layer');stage.append(choiceLayer);
  const frame=el('section',null,'paper life-dialogue');
  shell.append(frame);
  const nameplate=el('div',null,'dialogue-speaker-nameplate dialogue-speaker-nameplate--overlap');
  nameplate.style.backgroundImage='url("./design-assets/ui/BT04_blank_pale_green.png")';
  nameplate.hidden=true;
  shell.append(nameplate);
  const complete=()=>{
   if(completed)return;completed=true;
   onComplete({completionMode:'COMPLETE',selectedChoices:playback.snapshot().selectedChoices});
  };
  shell.onclick=event=>{
   if(event.target?.closest?.('button,a,input,select,textarea'))return;
   const current=playback.snapshot().node;
   if(current.type==='LINE'){playback.next();paint();return;}
   if(current.type==='END')complete();
  };
  const paint=()=>{
   const state=playback.snapshot(),current=state.node;
   const syncImage=(entry,kind)=>{
    const isBackground=kind==='dialogue-background';let image=isBackground?backgroundImage:focusImage;
    if(!entry){image?.remove();if(isBackground)backgroundImage=null;else focusImage=null;return;}
    if(!image){image=el('img');image.className=kind;stage.append(image);if(isBackground)backgroundImage=image;else focusImage=image;}
    if(!isBackground){
     image.classList?.toggle('dialogue-focus-centered',true);
     image.classList?.toggle('dialogue-focus-choice',playback.snapshot().node.type==='CHOICE');
    }
    if(image._dialogueSource!==entry.src){image.src=entry.src;image._dialogueSource=entry.src;}
    image.alt=entry.alt??'';
   };
   syncImage(state.background,'dialogue-background');syncImage(state.focus,'dialogue-focus');
   frame.replaceChildren();choiceLayer.replaceChildren();
   frame.hidden=current.type==='CHOICE';
   stage.classList?.toggle('dialogue-choice-active',current.type==='CHOICE');
   const mode=current.lineMode??'DIALOGUE',speaker=mode==='DIALOGUE'?payload.speakers[current.speaker]:null;
   if(speaker?.name)activeSpeaker=speaker;
   nameplate.hidden=!activeSpeaker?.name;
   nameplate.replaceChildren();
   if(activeSpeaker?.name)nameplate.append(el('span',activeSpeaker.name,'dialogue-speaker-nameplate-text'));
   if(payload.previewOnly===true)frame.append(el('small',payload.previewNotice??'연결 확인용 임시 원고 · 정식 시나리오·보상 아님','dialogue-preview-notice'));
   const actions=el('nav',null,'actions dialogue-actions');
   if(current.type==='LINE'){
    if(!speaker?.name)frame.append(el('small',lineLabels[mode]??''));
    frame.append(el('p',current.text,'dialogue-text'));
    log.push((speaker?.name? speaker.name+' · ':'')+current.text);
    const indicator=el('span','↓','dialogue-advance-indicator');indicator.setAttribute('aria-hidden','true');
    frame.append(indicator);
   }else if(current.type==='CHOICE'){
    const choices=el('nav',null,'dialogue-choice-panel-right');
    if(current.prompt)choices.append(el('p',current.prompt,'dialogue-choice-prompt'));
    for(const option of current.options)choices.append(btn(option.text,()=>{
     log.push('선택 · '+option.text);playback.choose(current.choiceNodeId,option.choiceId);paint();
    },'dialogue-choice dialogue-choice-nameplate'));
    for(const option of choices.children)option.style.backgroundImage='url("./design-assets/ui/BT04_blank_pale_green.png")';
    choiceLayer.append(choices);
   }else{
    frame.append(el('p','이야기가 끝났습니다.','dialogue-text'));
    const indicator=el('span','↓','dialogue-advance-indicator');indicator.setAttribute('aria-hidden','true');
    frame.append(indicator);
   }
   if(actions.children?.length)frame.append(actions);
  };
  paint();
 }};
}
