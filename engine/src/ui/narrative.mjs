import {finishNarrative,dismissNarrative} from '../core/narrative.mjs';
export function createNarrativeUI({el,btn,shell,heading,current,modal,npcStage,onSave}){
 return {render(){
  const pending=current().narrativeState?.pending;if(!pending)return;const content=pending.content,log=[];let index=0,stage='lines',choice=null,finished=false;
  const complete=skip=>{if(finished)return;if(skip)dismissNarrative(current());else finishNarrative(current(),choice?.id??null);finished=true;onSave();};
  heading(pending.title,'admission-story-page');const controls=el('nav',null,'story-top-controls');controls.append(btn('대화기록',()=>{const body=el('div');for(const line of log)body.append(el('p',line));modal('대화기록',body);},'text-button'),btn('건너뛰기',()=>complete(true),'text-button'));shell.append(controls);
  if(pending.actor?.image){const image=el('img',null,'npc-dialogue-image');image.src='./character-assets/'+pending.actor.image;image.alt=pending.actor.name;shell.append(npcStage(image));}
  const frame=el('section',null,'paper life-dialogue');shell.append(frame);
  const paint=()=>{
   frame.replaceChildren(el('h2',pending.title));const actions=el('nav',null,'actions');
   if(!content){frame.append(el('p','미등록 프레임 · 정식 대화 원고를 기다리고 있습니다.','dialogue-text'));actions.append(btn('계속',()=>complete(false)));}
   else if(stage==='lines'){
    const line=content.lines[index];frame.append(el('small',line.speaker??pending.actor?.name??''),el('p',line.text,'dialogue-text'));log.push(line.text);
    actions.append(btn('다음',()=>{if(index+1<content.lines.length)index++;else if(content.choices?.length)stage='choices';else if(content.closing)stage='closing';else{complete(false);return;}paint();}));
   }else if(stage==='choices')for(const option of content.choices)actions.append(btn(option.label,()=>{choice=option;log.push('선택 · '+option.label);stage='reaction';paint();}));
   else{const text=stage==='reaction'?choice.reaction:content.closing;frame.append(el('p',text,'dialogue-text'));log.push(text);actions.append(btn(stage==='reaction'?'다음':'이야기 마치기',()=>{if(stage==='reaction'){stage='closing';paint();}else complete(false);}));}
   frame.append(actions);
  };paint();
 }};
}
