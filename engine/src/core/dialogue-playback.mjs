const lineModes=new Set(['DIALOGUE','NARRATION','THOUGHT','CONTEXT']);
const visualModes=new Set(['SPEAKER','KEEP','NONE']);
const assetTypes=new Set(['CHARACTER','ITEM','SCENE','EFFECT']);
const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
export const toFullbodyCharacterSrc=src=>typeof src==='string'?src.replace(/([^/]+?)[1-5]_(?:base|listening|thinking|encouraging|relieved)(\.png)([?#].*)?$/i,(_match,prefix,extension,suffix='')=>`${prefix}0_fullbody${extension}${suffix}`):src;

function validateLine(line,speakers,{reaction=false}={}){
 if(!isRecord(line)||line.type&&line.type!=='LINE'||!lineModes.has(line.lineMode??'DIALOGUE')||typeof line.text!=='string'||!line.text.trim())throw new Error('대화 LINE 형식이 올바르지 않습니다.');
 if(line.visualMode!==undefined&&!visualModes.has(line.visualMode))throw new Error('대화 LINE 이미지 모드가 올바르지 않습니다.');
 const mode=line.lineMode??'DIALOGUE';
 if((mode==='DIALOGUE'||mode==='THOUGHT')&&(!line.speaker||!isRecord(speakers[line.speaker])))throw new Error('대화 LINE 화자를 찾을 수 없습니다.');
 if(mode==='THOUGHT'&&speakers[line.speaker]?.kind!=='PLAYER')throw new Error('속마음 화자는 PLAYER여야 합니다.');
 if(reaction&&line.type&&line.type!=='LINE')throw new Error('선택 반응은 LINE만 포함할 수 있습니다.');
}

function validateImage(node){
 if(!['BACKGROUND','FOCUS'].includes(node.target)||!['SHOW','REPLACE','HIDE'].includes(node.action)||!assetTypes.has(node.assetType)||node.action!=='HIDE'&&(typeof node.src!=='string'||!node.src.trim()))throw new Error('대화 IMAGE 형식이 올바르지 않습니다.');
}

function validateChoice(node,speakers){
 if(typeof node.choiceNodeId!=='string'||!node.choiceNodeId.trim()||!Array.isArray(node.options)||node.options.length===0)throw new Error('대화 CHOICE 형식이 올바르지 않습니다.');
 const ids=new Set();
 for(const option of node.options){
  if(!isRecord(option)||typeof option.choiceId!=='string'||!option.choiceId.trim()||ids.has(option.choiceId)||typeof option.text!=='string'||!option.text.trim()||!Array.isArray(option.reaction))throw new Error('대화 선택지 형식이 올바르지 않습니다.');
  ids.add(option.choiceId);for(const line of option.reaction)validateLine(line,speakers,{reaction:true});
 }
}

function validatePayload(payload){
 if(!isRecord(payload)||!isRecord(payload.speakers)||!Array.isArray(payload.sequence)||payload.sequence.length===0||payload.sequence.at(-1)?.type!=='END'||payload.sequence.filter(node=>node?.type==='END').length!==1)throw new Error('대화 sequence는 마지막 END를 포함해야 합니다.');
 for(const node of payload.sequence){
  if(!isRecord(node))throw new Error('대화 sequence 항목이 올바르지 않습니다.');
  if(node.sceneId!==undefined&&(typeof node.sceneId!=='string'||!/^S[1-5]$/.test(node.sceneId)))throw new Error('대화 씬 정보가 올바르지 않습니다.');
  if(node.type==='LINE')validateLine(node,payload.speakers);
  else if(node.type==='IMAGE')validateImage(node);
  else if(node.type==='CHOICE')validateChoice(node,payload.speakers);
  else if(node.type!=='END')throw new Error('지원하지 않는 대화 sequence 항목입니다.');
 }
}

export function createDialoguePlayback(payload){
 validatePayload(payload);
 const sequence=payload.sequence,speakers=payload.speakers,selectedChoices=[];
 let sequenceIndex=0,reactionLines=null,reactionIndex=0,node=null,focus=null,background=null,sceneId=null,ended=false;
 const copy=value=>value===null?null:structuredClone(value);
 const normalizeLine=line=>{const mode=line.lineMode??'DIALOGUE';return {...line,type:'LINE',lineMode:mode,visualMode:line.visualMode??(mode==='DIALOGUE'?'SPEAKER':'KEEP')};};
 const applyLine=line=>{
  const visual=line.visualMode;
  // The player speaks from the panel; the partner remains on the stage.
  if(speakers[line.speaker]?.kind==='PLAYER'&&focus?.assetType==='CHARACTER')return;
  if(visual==='NONE')focus=null;
  else if(visual==='SPEAKER'){
   const speaker=speakers[line.speaker];
   focus=speaker?.kind==='PLAYER'||!speaker?.portraitSrc?null:{src:toFullbodyCharacterSrc(speaker.portraitSrc),alt:speaker.name??'',assetType:'CHARACTER'};
  }
 };
 const snapshot=()=>({node:copy(node),focus:copy(focus),background:copy(background),sceneId,selectedChoices:copy(selectedChoices),ended});
 const advanceToDisplay=()=>{
  if(reactionLines){
   if(reactionIndex<reactionLines.length){node=normalizeLine(reactionLines[reactionIndex]);applyLine(node);return snapshot();}
   reactionLines=null;sequenceIndex++;
  }
  while(sequenceIndex<sequence.length){
   const current=sequence[sequenceIndex];
   if(current.sceneId)sceneId=current.sceneId;
   if(current.type==='IMAGE'){
    const value=current.action==='HIDE'?null:{src:current.assetType==='CHARACTER'?toFullbodyCharacterSrc(current.src):current.src,alt:current.alt??'',assetType:current.assetType};
    if(current.target==='FOCUS')focus=value;else background=value;
    sequenceIndex++;continue;
   }
   node=current;
   if(current.type==='LINE'){node=normalizeLine(current);applyLine(node);}
   if(current.type==='END')ended=true;
   return snapshot();
  }
  throw new Error('대화 sequence가 END 전에 끝났습니다.');
 };
 advanceToDisplay();
 return {
  snapshot,
  next(){
   if(ended)return snapshot();
   if(node?.type!=='LINE')throw new Error('현재 대화에서는 다음 줄로 이동할 수 없습니다.');
   if(reactionLines)reactionIndex++;else sequenceIndex++;
   return advanceToDisplay();
  },
  choose(choiceNodeId,choiceId){
   if(node?.type!=='CHOICE'||node.choiceNodeId!==choiceNodeId)throw new Error('현재 대화의 선택 노드가 아닙니다.');
   const option=node.options.find(item=>item.choiceId===choiceId);if(!option)throw new Error('현재 대화의 선택이 아닙니다.');
   selectedChoices.push({choiceNodeId,choiceId});reactionLines=option.reaction;reactionIndex=0;
   if(reactionLines.length===0){reactionLines=null;sequenceIndex++;}
   return advanceToDisplay();
  }
 };
}
