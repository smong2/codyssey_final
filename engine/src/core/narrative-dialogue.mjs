export function createNarrativeDialoguePayload(pending,{playerName='카엘'}={}){
 if(!pending||typeof pending.title!=='string')throw new Error('이야기 화면 정보를 확인할 수 없습니다.');
 const content=pending.content,speakers={},sequence=[];
 if(!content){
  return {schemaVersion:1,dialogueId:pending.id,storyId:pending.chain??pending.id,eventId:pending.id,title:pending.title,
   dialogueToken:null,canSkip:false,previewOnly:true,previewNotice:'미등록 프레임 · 정식 원고 대기 중',finishLabel:'계속',speakers,
   sequence:[{type:'LINE',lineMode:'NARRATION',text:'미등록 프레임 · 정식 대화 원고를 기다리고 있습니다.',visualMode:'NONE'},{type:'END'}]};
 }
 const actor=pending.actor;
 if(actor){speakers[actor.id]={kind:'CHARACTER',id:actor.id,name:actor.name,portraitSrc:actor.image?`/character-assets/${actor.image}`:null};
  if(actor.image)sequence.push({type:'IMAGE',target:'FOCUS',action:'SHOW',assetType:'CHARACTER',src:`/character-assets/${actor.image}`,alt:actor.name});}
 const speakerIdFor=name=>{
  if(!name)return null;
  if(actor&&name===actor.name)return actor.id;
  if(name===playerName||name==='{characterName}'){
   speakers.PLAYER={kind:'PLAYER',id:null,name:playerName};return 'PLAYER';
  }
  const id=`NARRATOR_${Object.keys(speakers).length}`;
  if(!speakers[id])speakers[id]={kind:'CHARACTER',id,name,portraitSrc:null};
  return id;
 };
 const makeLine=(text,name=null,visualMode='KEEP')=>{
  const speaker=speakerIdFor(name);return {type:'LINE',lineMode:speaker?'DIALOGUE':'NARRATION',...(speaker?{speaker}:{}),text,visualMode};
 };
 for(const line of content.lines??[])sequence.push(makeLine(line.text,line.speaker??actor?.name??null));
 const choices=content.choices??[];
 if(choices.length)sequence.push({type:'CHOICE',choiceNodeId:`PREVIEW_${pending.id}`,options:choices.map(choice=>({choiceId:choice.id,text:choice.label,
  reaction:[makeLine(choice.reaction,actor?.name??null)]}))});
 if(content.closing)sequence.push(makeLine(content.closing,null));
 sequence.push({type:'END'});
 return {schemaVersion:1,dialogueId:pending.id,storyId:pending.chain??pending.id,eventId:pending.id,title:pending.title,
  dialogueToken:null,canSkip:true,previewOnly:true,previewNotice:'실행형 시안 · 연결된 로컬 이야기 데이터',speakers,sequence};
}
