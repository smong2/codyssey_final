import test from 'node:test';
import assert from 'node:assert/strict';
import {createDialoguePlayback,toFullbodyCharacterSrc} from '../src/core/dialogue-playback.mjs';

test('maps bust character assets to their matching full-body asset',()=>{
 assert.equal(toFullbodyCharacterSrc('/character-assets/tia1_base.png'),'/character-assets/tia0_fullbody.png');
 assert.equal(toFullbodyCharacterSrc('/character-assets/tia2_listening.png'),'/character-assets/tia0_fullbody.png');
 assert.equal(toFullbodyCharacterSrc('/character-assets/tia0_fullbody.png'),'/character-assets/tia0_fullbody.png');
 assert.equal(toFullbodyCharacterSrc('/guide.png'),'/guide.png');
});

test('uses full-body assets for dialogue speakers and choice portraits',()=>{
 const data={...payload,speakers:{...payload.speakers,GUIDE:{...payload.speakers.GUIDE,portraitSrc:'/character-assets/tia1_base.png'}},sequence:[
  {type:'IMAGE',target:'FOCUS',action:'SHOW',assetType:'CHARACTER',src:'/character-assets/tia2_listening.png',alt:'티아'},
  {type:'CHOICE',choiceNodeId:'C',options:[{choiceId:'A',text:'선택',reaction:[{lineMode:'DIALOGUE',speaker:'GUIDE',text:'대답'}]}]},
  {type:'END'}
 ]};
 const playback=createDialoguePlayback(data);
 assert.equal(playback.snapshot().focus.src,'/character-assets/tia0_fullbody.png');
 playback.choose('C','A');
 assert.equal(playback.snapshot().focus.src,'/character-assets/tia0_fullbody.png');
});

const payload={schemaVersion:1,dialogueId:'D1',storyId:'S1',eventId:'E1',title:'대화 계약',dialogueToken:'opaque-test',canSkip:false,
 speakers:{PLAYER:{kind:'PLAYER',id:'CH01',name:'카엘',portraitSrc:'/player.png'},GUIDE:{kind:'CHARACTER',id:'CH16',name:'티아',portraitSrc:'/guide.png'}},
 sequence:[
  {type:'IMAGE',target:'BACKGROUND',action:'SHOW',assetType:'SCENE',src:'/scene.png',alt:'광장'},
  {type:'IMAGE',target:'BACKGROUND',action:'REPLACE',assetType:'SCENE',src:'/scene-replaced.png',alt:'바뀐 광장'},
  {type:'LINE',lineMode:'NARRATION',text:'광장에 바람이 분다.',visualMode:'NONE'},
  {type:'IMAGE',target:'FOCUS',action:'SHOW',assetType:'CHARACTER',src:'/guide.png',alt:'티아'},
  {type:'LINE',lineMode:'DIALOGUE',speaker:'GUIDE',text:'무엇을 볼까?',visualMode:'KEEP'},
  {type:'CHOICE',choiceNodeId:'C1',prompt:'고르세요.',options:[
   {choiceId:'A',text:'왼쪽',reaction:[{lineMode:'DIALOGUE',speaker:'GUIDE',text:'왼쪽을 본다.'}]},
   {choiceId:'B',text:'오른쪽',reaction:[{lineMode:'DIALOGUE',speaker:'GUIDE',text:'오른쪽을 본다.'}]}
  ]},
  {type:'LINE',lineMode:'THOUGHT',speaker:'PLAYER',text:'기억해 두자.',visualMode:'KEEP'},
  {type:'CHOICE',choiceNodeId:'C2',options:[{choiceId:'C',text:'마무리',reaction:[]}]},
  {type:'IMAGE',target:'BACKGROUND',action:'HIDE',assetType:'SCENE',alt:'배경 숨김'},
  {type:'IMAGE',target:'FOCUS',action:'REPLACE',assetType:'ITEM',src:'/item.png',alt:'룬'},
  {type:'LINE',lineMode:'CONTEXT',text:'작은 룬 조각이 남았다.'},
  {type:'IMAGE',target:'FOCUS',action:'HIDE',assetType:'ITEM',alt:'아이템 숨김'},
  {type:'END'}
 ]};

test('plays ordered lines, applies image slots, and resumes common sequence after two choice reactions',()=>{
 const playback=createDialoguePlayback(payload);
 assert.deepEqual(playback.snapshot().background,{src:'/scene-replaced.png',alt:'바뀐 광장',assetType:'SCENE'});
 assert.equal(playback.snapshot().node.text,'광장에 바람이 분다.');
 playback.next();
 assert.equal(playback.snapshot().node.speaker,'GUIDE');
 assert.deepEqual(playback.snapshot().focus,{src:'/guide.png',alt:'티아',assetType:'CHARACTER'});
 playback.next();
 assert.equal(playback.snapshot().node.type,'CHOICE');
 assert.throws(()=>playback.choose('C1','missing'),/선택/);
 playback.choose('C1','A');
 assert.equal(playback.snapshot().node.text,'왼쪽을 본다.');
 playback.next();
 assert.equal(playback.snapshot().node.lineMode,'THOUGHT');
 assert.equal(playback.snapshot().focus.src,'/guide.png');
 playback.next();
 playback.choose('C2','C');
 assert.equal(playback.snapshot().node.lineMode,'CONTEXT');
 assert.equal(playback.snapshot().background,null);
 assert.deepEqual(playback.snapshot().focus,{src:'/item.png',alt:'룬',assetType:'ITEM'});
 assert.deepEqual(playback.snapshot().selectedChoices,[{choiceNodeId:'C1',choiceId:'A'},{choiceNodeId:'C2',choiceId:'C'}]);
 playback.next();
 assert.equal(playback.snapshot().focus,null);
 playback.next();
 assert.equal(playback.snapshot().ended,true);
 assert.equal(playback.snapshot().node.type,'END');
});

test('uses documented LINE defaults and never displays the PLAYER portrait',()=>{
 const data={...payload,speakers:{PLAYER:payload.speakers.PLAYER,GUIDE:{kind:'CHARACTER',id:'X',name:'화자',portraitSrc:null}},sequence:[
  {type:'LINE',speaker:'GUIDE',text:'이미지가 없는 화자.'},
  {type:'LINE',lineMode:'THOUGHT',speaker:'PLAYER',text:'속마음.'},
  {type:'LINE',lineMode:'DIALOGUE',speaker:'PLAYER',text:'플레이어 대사.'},
  {type:'END'}
 ]};
 const playback=createDialoguePlayback(data);
 assert.equal(playback.snapshot().node.lineMode,'DIALOGUE');
 assert.equal(playback.snapshot().focus,null);
 playback.next();
 assert.equal(playback.snapshot().node.lineMode,'THOUGHT');
 assert.equal(playback.snapshot().focus,null);
 playback.next();
 assert.equal(playback.snapshot().focus,null);
});

test('rejects an invalid sequence before it can be played',()=>{
 assert.throws(()=>createDialoguePlayback({...payload,sequence:[{type:'CHOICE',choiceNodeId:'C',options:[]}]}),/END/);
});
