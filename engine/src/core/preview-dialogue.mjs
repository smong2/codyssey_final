export function createPreviewDialoguePayload(event,content){
 if(!event||!content?.previewOnly||!Array.isArray(content.choices))throw new Error('연결 확인용 이야기 데이터가 올바르지 않습니다.');
 const npc=Boolean(event.npcId),speakerId=npc?event.npcId:null,lineMode=npc?'DIALOGUE':'NARRATION';
 const speakers=npc?{[speakerId]:{kind:'CHARACTER',id:speakerId,name:content.speaker,portraitSrc:content.image?`/character-assets/${content.image}`:null}}:{};
 const line=(text,visualMode=npc?'SPEAKER':'NONE')=>({type:'LINE',lineMode,speaker:npc?speakerId:undefined,text,visualMode});
 const sequence=[line(content.line),{
  type:'CHOICE',choiceNodeId:`PREVIEW_${event.eventId}`,
  options:content.choices.map(option=>({choiceId:option.id,text:option.label,reaction:[line(option.reaction,'KEEP')]}))
 },line(content.closing,'KEEP'),{type:'END'}];
 return {schemaVersion:1,dialogueId:event.eventId,storyId:event.storyId,eventId:event.eventId,title:content.title,
  dialogueToken:null,canSkip:false,previewOnly:true,speakers,sequence};
}

export function createUnregisteredDialoguePayload({dialogueId,title,speakerId,speakerName,portraitSrc,frameText,finishLabel='계속'}){
 if(![dialogueId,title,frameText].every(value=>typeof value==='string'&&value.trim()))throw new Error('미등록 대화 프레임 정보가 올바르지 않습니다.');
 const speakers=speakerId&&speakerName?{[speakerId]:{kind:'CHARACTER',id:speakerId,name:speakerName,portraitSrc:portraitSrc??null}}:{};
 const sequence=[];
 if(portraitSrc)sequence.push({type:'IMAGE',target:'FOCUS',action:'SHOW',assetType:'CHARACTER',src:portraitSrc,alt:speakerName??''});
 sequence.push({type:'LINE',lineMode:'NARRATION',text:frameText,visualMode:portraitSrc?'KEEP':'NONE'},{type:'END'});
 return {schemaVersion:1,dialogueId,storyId:dialogueId,eventId:dialogueId,title,dialogueToken:null,canSkip:false,previewOnly:true,
  previewNotice:'미등록 프레임 · 정식 대사·선택·관계 변경 없음',finishLabel,speakers,sequence};
}

export function createAdmissionPreviewPayload(scene,actor,{finishLabel='다음 장면'}={}){
 if(!scene?.id||!scene?.title||!actor?.id||!actor?.name||!actor?.image)throw new Error('입학 대화 미리보기 정보가 올바르지 않습니다.');
 return {schemaVersion:1,dialogueId:`PREVIEW_${scene.id}`,storyId:'MS01',eventId:scene.id,title:scene.title,dialogueToken:null,
  canSkip:true,previewOnly:true,previewNotice:'임시 미리보기 · 정식 대사·캐스팅·보상 아님',focusPosition:'CENTER',finishLabel,
  speakers:{[actor.id]:{kind:'CHARACTER',id:actor.id,name:actor.name,portraitSrc:`/character-assets/${actor.image}`}},
  sequence:[
   {type:'IMAGE',target:'FOCUS',action:'SHOW',assetType:'CHARACTER',src:`/character-assets/${actor.image}`,alt:actor.name},
   {type:'LINE',lineMode:'DIALOGUE',speaker:actor.id,text:'반가워요! 이 장면은 대화 UI 확인용 임시 문구예요.',visualMode:'KEEP'},
   {type:'END'}]};
}
