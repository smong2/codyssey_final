import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDialogueUI} from '../src/ui/dialogue.mjs';
import * as dialogueUI from '../src/ui/dialogue.mjs';
import {createAdmissionPreviewPayload} from '../src/core/preview-dialogue.mjs';

function node(tag,text='',className=''){
 const item={tag,text,className,src:'',alt:'',type:'',style:{},children:[],append(...items){for(const child of items){child.parentElement=this;this.children.push(child);}},replaceChildren(...items){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...items);},remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;},setAttribute(){},addEventListener(){},showModal(){this.open=true;},get textContent(){return [this.text,...this.children.map(child=>child.textContent)].filter(Boolean).join(' ');}};
 item.classList={toggle(name,enabled){const names=new Set(item.className.split(/\s+/).filter(Boolean));if(enabled)names.add(name);else names.delete(name);item.className=[...names].join(' ');}};
 return item;
}
const all=element=>[element,...element.children.flatMap(all)];
test('story results show only actual visible growth and wait for confirmation',()=>{
 assert.equal(typeof dialogueUI.createStoryResultUI,'function');
 const target=node('main');let advanced=0;
 const ui=dialogueUI.createStoryResultUI({el:node,btn:(text,onclick,className)=>Object.assign(node('button',text,className),{onclick})});
 ui.show(target,{completionMode:'COMPLETE',visibleStatDelta:{knowledge:1,skill:2,magic:0}},()=>advanced++);
 assert.match(target.textContent,/지식 \+1/);assert.match(target.textContent,/솜씨 \+2/);assert.doesNotMatch(target.textContent,/마법 \+0|Hidden|공감/);assert.equal(advanced,0);
 all(target).find(item=>item.tag==='button').onclick();assert.equal(advanced,1);
});
function setup(payload,{animated=false,getRoomBackground=()=>null,...options}={}){
 const shell=node('main');let history=null,completed=null,skipped=null;
 const makeNode=(...args)=>{const item=node(...args);if(animated){item.animations=[];item.animate=(frames,settings)=>{const animation={frames,settings,onfinish:null,cancel(){this.cancelled=true;},finish(){this.onfinish?.();}};item.animations.push(animation);return animation;};}return item;};
 const ui=createDialogueUI({el:makeNode,btn:(text,onclick,className)=>Object.assign(node('button',text,className),{onclick}),shell,getRoomBackground,
  heading(title,className){shell.className=className;shell.replaceChildren(node('h1',title));},
  modal(title,body){history={title,body};}});
 const click=label=>{const button=all(shell).find(item=>item.tag==='button'&&item.text===label);assert.ok(button,`button ${label} exists`);button.onclick();};
 ui.render({payload,...options,onComplete:value=>{completed=value;},onSkip:value=>{skipped=value;}});
 const surfaceClick=()=>shell.onclick?.({target:{closest:()=>null}});
 return {shell,click,surfaceClick,get history(){return history;},get completed(){return completed;},get skipped(){return skipped;}};
}
const payload=(canSkip=false)=>({schemaVersion:1,dialogueId:'UI',storyId:'UI',eventId:'UI',title:'대화 테스트',dialogueToken:'opaque',canSkip,
 speakers:{PLAYER:{kind:'PLAYER',id:'CH01',name:'카엘',portraitSrc:'/player.png'},GUIDE:{kind:'CHARACTER',id:'CH16',name:'티아',portraitSrc:'/guide.png'}},
 sequence:[{type:'IMAGE',target:'BACKGROUND',action:'SHOW',assetType:'SCENE',src:'/scene.png',alt:'광장'},
  {type:'LINE',lineMode:'NARRATION',text:'저녁 바람이 분다.',visualMode:'NONE'},
  {type:'LINE',lineMode:'DIALOGUE',speaker:'GUIDE',text:'안녕.',visualMode:'SPEAKER'},
  {type:'CHOICE',choiceNodeId:'C1',prompt:'답해 볼까?',options:[{choiceId:'A',text:'응',reaction:[{lineMode:'DIALOGUE',speaker:'GUIDE',text:'반가워.'}]}]},
  {type:'LINE',lineMode:'THOUGHT',speaker:'PLAYER',text:'좋은 만남이다.',visualMode:'NONE'},
  {type:'END'}]});

test('scene callback follows actual scene changes without replaying on choice reactions',()=>{
 const data=payload(),seen=[];data.storyId='MS05';data.eventId='MS05';
 data.sequence[0].sceneId='S2';data.sequence[3].sceneId='S3';data.sequence[4].sceneId='S4';
 const view=setup(data,{onSceneChange:scene=>seen.push(scene)});
 view.surfaceClick();view.surfaceClick();view.click('응');
 assert.deepEqual(seen,[{storyId:'MS05',eventId:'MS05',sceneId:'S2'},{storyId:'MS05',eventId:'MS05',sceneId:'S3'}]);
 view.surfaceClick();assert.equal(seen.at(-1).sceneId,'S4');
});

test('renders shared dialogue controls, imagery, choice reactions, history, and automatic END completion',async()=>{
 const view=setup(payload());
 assert.match(view.shell.textContent,/저녁 바람이 분다/);
 assert.equal(all(view.shell).some(item=>item.tag==='img'&&item.src==='/scene.png'),true);
 assert.equal(all(view.shell).some(item=>item.tag==='img'&&item.src==='/player.png'),false);
 assert.equal(all(view.shell).some(item=>item.tag==='button'&&item.text==='건너뛰기'),false);
 view.shell.onclick({target:{closest:()=>({})}});
 assert.match(view.shell.textContent,/저녁 바람이 분다/);
 view.surfaceClick();
 assert.equal(all(view.shell).some(item=>item.tag==='img'&&item.src==='/guide.png'),true);
 view.surfaceClick();
 const choicePanel=all(view.shell).find(item=>item.className.includes('dialogue-choice-panel-right'));
 assert.ok(choicePanel);
 const choicePortrait=all(view.shell).find(item=>item.tag==='img'&&item.src==='/guide.png');
 assert.match(choicePortrait.className,/dialogue-focus-choice/);
 assert.equal(all(view.shell).some(item=>item.className.includes('life-dialogue')&&!item.hidden),true);
 view.click('응');
 assert.match(view.shell.textContent,/반가워/);
 view.surfaceClick();
 assert.match(view.shell.textContent,/좋은 만남이다/);
 view.surfaceClick();view.surfaceClick();await Promise.resolve();
 assert.deepEqual(view.completed,{completionMode:'COMPLETE',selectedChoices:[{choiceNodeId:'C1',choiceId:'A'}]});
 view.click('대화기록');
 assert.match(view.history.body.textContent,/저녁 바람이 분다/);
 assert.match(view.history.body.textContent,/선택.*응/);
});

test('history separates speaker names from lines and groups entries by scene background',()=>{
 const data=payload();
 data.sequence=[
  {type:'IMAGE',target:'BACKGROUND',action:'SHOW',assetType:'SCENE',src:'/lake.png',alt:'BG01_arcadia_entrance_and_lake_1920x1080_010.png'},
  {type:'LINE',lineMode:'DIALOGUE',speaker:'GUIDE',text:'어서 와.'},
  {type:'LINE',lineMode:'THOUGHT',speaker:'PLAYER',text:'멋진 곳이다.'},
  {type:'IMAGE',target:'BACKGROUND',action:'REPLACE',assetType:'SCENE',src:'/square.png',alt:'BG02_clock_square.png'},
  {type:'LINE',lineMode:'DIALOGUE',speaker:'GUIDE',text:'광장부터 가자.'},
  {type:'CHOICE',choiceNodeId:'C1',options:[{choiceId:'A',text:'응',reaction:[]}]},
  {type:'END'}
 ];
 const view=setup(data);
 view.surfaceClick();view.surfaceClick();view.surfaceClick();view.click('응');
 view.click('대화기록');
 const scenes=all(view.history.body).filter(item=>item.className==='dialogue-history-scene');
 assert.equal(scenes.length,2);
 assert.doesNotMatch(view.history.body.textContent,/BG01|BG02|\.png/);
 const names=all(scenes[0]).filter(item=>item.className==='dialogue-history-speaker');
 assert.deepEqual(names.map(item=>item.textContent),['티아','카엘']);
 const texts=all(scenes[0]).filter(item=>item.className==='dialogue-history-text');
 assert.deepEqual(texts.map(item=>item.textContent),['어서 와.',"'멋진 곳이다.'"]);
 const choice=all(scenes[1]).find(item=>item.className.includes('dialogue-history-entry--choice'));
 assert.equal(choice.children[0].textContent,'선택');
 assert.equal(choice.children[1].textContent,'응');
});

test('shows skip only when the service payload permits it and passes selected choices to callback',()=>{
 const view=setup(payload(true));
 view.click('건너뛰기');
 assert.deepEqual(view.skipped,{completionMode:'SKIP',selectedChoices:[]});
 assert.equal(view.completed,null);
});

test('completes automatically at END without a synthetic ending sentence',async()=>{
 const view=setup({...payload(),sequence:[
  {type:'LINE',lineMode:'DIALOGUE',speaker:'GUIDE',text:'마지막 인사'},
  {type:'END'}
 ]});
 view.surfaceClick();
 await Promise.resolve();
 assert.doesNotMatch(view.shell.textContent,/이야기가 끝났습니다/);
 assert.deepEqual(view.completed,{completionMode:'COMPLETE',selectedChoices:[]});
});

test('shows the player name on thoughts while leaving narration unnamed',()=>{
 const view=setup(payload());
 const nameplate=all(view.shell).find(item=>item.className.includes('dialogue-speaker-nameplate'));
 assert.equal(nameplate.hidden,true);
 assert.match(view.shell.textContent,/\[저녁 바람이 분다\.\]/);
 assert.doesNotMatch(view.shell.textContent,/장면|속마음/);
 view.surfaceClick();
 view.surfaceClick();
 view.click('응');
 view.surfaceClick();
 assert.match(view.shell.textContent,/'좋은 만남이다\.'/);
 assert.equal(nameplate.hidden,false);
 assert.equal(nameplate.textContent,'카엘');
});

test('labels local-only dialogue payloads as preview content',()=>{
 const view=setup({...payload(),previewOnly:true});
 assert.match(view.shell.textContent,/연결 확인용 임시 원고/);
 assert.match(view.shell.textContent,/정식 시나리오·보상 아님/);
});

test('shows the admission preview NPC centered in the shared dialogue UI without showing the player',()=>{
 const payload=createAdmissionPreviewPayload({id:'admission-arrival',title:'시계탑 광장에 도착'},
  {id:'CH16',name:'티아',image:'tia0_fullbody.png'});
 const view=setup(payload,{extraControls:[Object.assign(node('button','이전','text-button'),{onclick:()=>{}})]});
 const portrait=all(view.shell).find(item=>item.tag==='img'&&item.src==='/character-assets/tia0_fullbody.png');
 assert.ok(portrait);
 assert.match(portrait.className,/dialogue-focus-centered/);
 assert.equal(all(view.shell).some(item=>item.tag==='img'&&item.src.includes('player')),false);
 assert.match(view.shell.textContent,/티아/);
 assert.match(view.shell.textContent,/임시 미리보기/);
 assert.match(view.shell.textContent,/이전/);
 assert.match(view.shell.textContent,/임시 문구/);
});

test('uses the original dialogue frame, shows the speaker nameplate and advances by clicking anywhere with a bottom-center arrow',()=>{
 const view=setup({...payload(),sequence:[
  {type:'IMAGE',target:'FOCUS',action:'SHOW',assetType:'CHARACTER',src:'/character-assets/tia1_base.png',alt:'티아 기본'},
  {type:'LINE',lineMode:'DIALOGUE',speaker:'GUIDE',text:'티아가 이야기를 듣는다.',visualMode:'KEEP'},
  {type:'IMAGE',target:'FOCUS',action:'REPLACE',assetType:'CHARACTER',src:'/character-assets/tia2_listening.png',alt:'티아 경청'},
  {type:'LINE',lineMode:'DIALOGUE',speaker:'GUIDE',text:'티아가 고개를 끄덕인다.',visualMode:'KEEP'},
  {type:'END'}
 ]});
 const frame=all(view.shell).find(item=>item.tag==='section'&&item.className.includes('life-dialogue'));
 assert.equal(frame.className.includes('dialogue-panel-asset'),false);
 assert.equal(Boolean(frame.style.backgroundImage),false);
 assert.doesNotMatch(view.shell.textContent,/대화 테스트/);
 const nameplate=all(view.shell).find(item=>item.className.includes('dialogue-speaker-nameplate'));
 assert.ok(nameplate);
 assert.equal(nameplate.textContent,'티아');
 assert.equal(nameplate.children[0]?.className,'dialogue-speaker-nameplate-text');
 assert.ok(view.shell.children.includes(nameplate),'nameplate persists outside the replaceable dialogue content');
 assert.match(nameplate.className,/dialogue-speaker-nameplate--overlap/);
 assert.equal(nameplate.style.backgroundImage,'url("./design-assets/ui/BT04_blank_pale_green_short.png")');
 const arrow=all(frame).find(item=>item.className.includes('dialogue-advance-indicator'));
 assert.ok(arrow);
 assert.equal(arrow.children[0].src,'./design-assets/ui/UI24_journal_arrow_down.png');
 assert.equal(all(frame).some(item=>item.tag==='button'&&['다음','다음 장면'].includes(item.text)),false);
 assert.equal(all(view.shell).some(item=>item.tag==='img'&&item.src==='/character-assets/tia0_fullbody.png'),true);
 view.surfaceClick();
 assert.equal(all(view.shell).some(item=>item.tag==='img'&&item.src==='/character-assets/tia0_fullbody.png'&&item.alt==='티아 경청'),true);
});

test('keeps the dialogue character full-body and uncropped during choices',()=>{
 const css=readFileSync(new URL('../preview.css',import.meta.url),'utf8');
 const choiceRule=css.match(/\.dialogue-stage \.dialogue-focus\.dialogue-focus-choice\{([^}]*)\}/)?.[1]??'';
 assert.match(choiceRule,/object-fit:contain/);
 assert.match(choiceRule,/object-position:center bottom/);
 assert.doesNotMatch(choiceRule,/object-fit:cover/);
 assert.match(choiceRule,/height:100%/);
});

test('anchors the speaker nameplate at BT04 native ratio and outlines the dialogue panel in matching gold',()=>{
 const css=readFileSync(new URL('../preview.css',import.meta.url),'utf8');
 const rules=[...css.matchAll(/\.dialogue-speaker-nameplate\{([^}]*)\}/g)].map(match=>match[1]);
 assert.ok(rules.length>=2,'desktop and compact-landscape nameplate rules exist');
 const positionRule=rules[0];
 assert.match(positionRule,/position:absolute/);
 assert.match(positionRule,/top:calc\(100% -/);
 assert.match(positionRule,/left:calc\(/);
 assert.match(positionRule,/transform:translateY\(-50%\)/);
 const nativeRatioRule=rules.find(item=>/aspect-ratio:1940\s*\/\s*311/.test(item));
 assert.ok(nativeRatioRule,'BT04 native aspect ratio is applied');
 assert.match(nativeRatioRule,/width:clamp\(220px,28vw,360px\)/);
 assert.match(nativeRatioRule,/height:auto/);
 assert.match(nativeRatioRule,/background-size:contain/);
 assert.match(positionRule,/color:#fff8df/);
 assert.match(positionRule,/font-weight:700/);
 assert.match(css,/\.dialogue-speaker-nameplate\[hidden\]\{display:none\}/);
 const textRule=css.match(/\.dialogue-speaker-nameplate-text\{([^}]*)\}/)?.[1]??'';
 assert.match(textRule,/line-height:1/);
 assert.match(textRule,/transform:translateY\(-\.08em\)/);
 const compactRule=rules.find(rule=>/width:clamp\(164px,28vw,224px\)/.test(rule)&&/aspect-ratio:1940\s*\/\s*311/.test(rule));
 assert.match(compactRule,/width:clamp\(164px,28vw,224px\)/);
 assert.match(compactRule,/aspect-ratio:1940\s*\/\s*311/);
 assert.match(compactRule,/height:auto/);
 const frameRules=[...css.matchAll(/#shell\.dialogue-preview-page>\.life-dialogue,#shell\.admission-story-page>\.life-dialogue\{([^}]*)\}/g)].map(match=>match[1]);
 const frameRule=frameRules.at(-1)??'';
 assert.match(frameRule,/border:1px solid #b79555/);
 const choiceRule=css.match(/\.dialogue-choice-panel-right \.dialogue-choice-nameplate\{([^}]*)\}/)?.[1]??'';
 assert.match(choiceRule,/background-size:contain/);
 assert.match(choiceRule,/box-shadow:inset 0 0 0 999px #fff8e9bf/);
});

test('keeps the previous question and its speaker visible while choices are open',()=>{
 const view=setup(payload());
 view.surfaceClick();
 view.surfaceClick();
 const frame=all(view.shell).find(item=>item.className.includes('life-dialogue'));
 const nameplate=all(view.shell).find(item=>item.className.includes('dialogue-speaker-nameplate'));
 assert.equal(frame.hidden,false);
 assert.ok(nameplate);
 assert.equal(nameplate.hidden,false);
 assert.equal(nameplate.textContent,'티아');
 assert.match(frame.textContent,/안녕\./);
 assert.ok(view.shell.children.includes(nameplate));
});

test('keeps the last spoken question instead of replacing it with a choice prompt or an empty panel',()=>{
 const view=setup({...payload(),sequence:[
  {type:'LINE',speaker:'GUIDE',text:'여기서 가장 기대되는 건 뭐야?'},
  {type:'CHOICE',choiceNodeId:'C',prompt:'하나를 골라주세요.',options:[{choiceId:'A',text:'새 친구를 만나고 싶어.',reaction:[{speaker:'GUIDE',text:'멋진 친구들을 만나게 될 거야.'}]}]},
  {type:'END'}
 ]});
 view.surfaceClick();
 const frame=all(view.shell).find(item=>item.className.includes('life-dialogue'));
 assert.match(frame.textContent,/여기서 가장 기대되는 건 뭐야\?/);
 assert.doesNotMatch(frame.textContent,/하나를 골라주세요/);
 view.click('새 친구를 만나고 싶어.');
 assert.match(frame.textContent,/멋진 친구들을 만나게 될 거야/);
 assert.doesNotMatch(frame.textContent,/가장 기대되는/);
 view.click('대화기록');
 assert.equal((view.history.body.textContent.match(/가장 기대되는/g)??[]).length,1);
});

test('shows the player face inside the panel while keeping the partner on stage',()=>{
 const view=setup({...payload(),sequence:[
  {type:'LINE',speaker:'GUIDE',text:'안녕.'},
  {type:'LINE',speaker:'PLAYER',text:'나도 반가워.'},
  {type:'LINE',speaker:'GUIDE',text:'같이 가자.'},
  {type:'END'}
 ]});
 const partner=all(view.shell).find(item=>item.tag==='img'&&item.src==='/guide.png');
 view.surfaceClick();
 const frame=all(view.shell).find(item=>item.className.includes('life-dialogue'));
 const face=all(frame).find(item=>item.tag==='img'&&item.src==='/player.png');
 assert.ok(face,'player face is in the dialogue panel');
 assert.equal(all(view.shell).find(item=>item.tag==='img'&&item.src==='/guide.png'),partner);
 view.surfaceClick();
 assert.equal(all(frame).some(item=>item.tag==='img'&&item.src==='/player.png'),false);
});

test('resolves the player face from character ID when the real API omits portraitSrc',()=>{
 const view=setup({...payload(),speakers:{...payload().speakers,PLAYER:{kind:'PLAYER',id:'CH08',name:'아이리스',portraitSrc:null}},sequence:[
  {type:'LINE',speaker:'PLAYER',text:'내가 한 번 살펴볼게.'},{type:'END'}
 ]});
 const frame=all(view.shell).find(item=>item.className.includes('life-dialogue'));
 assert.ok(all(frame).some(item=>item.tag==='img'&&item.src==='./character-assets/iris0_fullbody.png'));
});

test('does not replay the partner entrance when only the scene or speaker changes',()=>{
 const view=setup({...payload(),sequence:[
  {type:'LINE',speaker:'GUIDE',text:'여기는 광장이야.'},
  {type:'IMAGE',target:'BACKGROUND',action:'REPLACE',assetType:'SCENE',src:'/next-scene.png'},
  {type:'LINE',speaker:'PLAYER',text:'멋진 곳이네.'},
  {type:'LINE',speaker:'GUIDE',text:'그렇지?'},
  {type:'END'}
 ]},{animated:true});
 const partner=all(view.shell).find(item=>item.tag==='img'&&item.src==='/guide.png');
 const initialAnimations=partner.animations.length;
 view.surfaceClick();view.surfaceClick();
 assert.equal(all(view.shell).find(item=>item.tag==='img'&&item.src==='/guide.png'),partner);
 assert.equal(partner.animations.length,initialAnimations);
});

test('holds the outgoing background until its replacement has loaded and dissolved in',()=>{
 const view=setup({...payload(),sequence:[
  {type:'IMAGE',target:'BACKGROUND',action:'SHOW',assetType:'SCENE',src:'/first.png'},
  {type:'LINE',lineMode:'NARRATION',text:'첫 장면.'},
  {type:'IMAGE',target:'BACKGROUND',action:'REPLACE',assetType:'SCENE',src:'/second.png'},
  {type:'LINE',lineMode:'NARRATION',text:'다음 장면.'},
  {type:'END'}
 ]},{animated:true});
 const first=all(view.shell).find(item=>item.src==='/first.png');first.onload?.();
 first.animations.forEach(animation=>animation.finish());
 view.surfaceClick();
 const second=all(view.shell).find(item=>item.src==='/second.png');
 assert.ok(second);assert.notEqual(first,second);
 assert.ok(all(view.shell).includes(first),'old background remains during image loading');
 second.onload();
 assert.ok(all(view.shell).includes(first),'old background remains during dissolve');
 second.animations.at(-1).finish();
 assert.equal(all(view.shell).includes(first),false);
});

test('uses myroom framing only when the story background matches the active room',()=>{
 const room='/world-assets/BG11_myroom2_day_1920x1080_023.png';
 const view=setup({...payload(),sequence:[
  {type:'IMAGE',target:'BACKGROUND',action:'SHOW',assetType:'SCENE',src:room},
  {type:'LINE',speaker:'GUIDE',text:'여기가 네 방이야.'},
  {type:'LINE',speaker:'PLAYER',text:'여기서 시작하면 되겠네.'},
  {type:'IMAGE',target:'BACKGROUND',action:'REPLACE',assetType:'SCENE',src:'/world-assets/another-room.png'},
  {type:'LINE',speaker:'GUIDE',text:'다른 곳도 가 볼까?'},{type:'END'}
 ]},{getRoomBackground:()=>'.'+room,animated:true});
 const background=all(view.shell).find(item=>item.src===room);
 const stage=all(view.shell).find(item=>item.className.split(' ').includes('dialogue-stage'));
 assert.match(background.className,/dialogue-background-room/);
 assert.match(stage.className,/dialogue-room-background/);
 background.onload();background.animations.forEach(animation=>animation.finish());
 view.surfaceClick();
 assert.equal(all(view.shell).find(item=>item.src===room),background);
 assert.equal(background.animations.length,1,'same-room dialogue must not restart the background dissolve');
 view.surfaceClick();
 const next=all(view.shell).find(item=>item.src==='/world-assets/another-room.png');
 assert.doesNotMatch(next.className,/dialogue-background-room/);
 assert.doesNotMatch(stage.className,/dialogue-room-background/);
});

test('keeps the last visible scene when fast navigation skips a loading image and the next image fails',()=>{
 const view=setup({...payload(),sequence:[
  {type:'IMAGE',target:'BACKGROUND',action:'SHOW',assetType:'SCENE',src:'/first.png'},
  {type:'LINE',lineMode:'NARRATION',text:'첫 장면.'},
  {type:'IMAGE',target:'BACKGROUND',action:'REPLACE',assetType:'SCENE',src:'/loading.png'},
  {type:'LINE',lineMode:'NARRATION',text:'다음 장면.'},
  {type:'IMAGE',target:'BACKGROUND',action:'REPLACE',assetType:'SCENE',src:'/broken.png'},
  {type:'LINE',lineMode:'NARRATION',text:'마지막 장면.'},{type:'END'}
 ]},{animated:true});
 const first=all(view.shell).find(item=>item.src==='/first.png');first.onload();
 first.animations.forEach(animation=>animation.finish());
 view.surfaceClick();
 const loading=all(view.shell).find(item=>item.src==='/loading.png');
 view.surfaceClick();
 const broken=all(view.shell).find(item=>item.src==='/broken.png');broken.onerror();
 assert.ok(all(view.shell).includes(first));
 assert.equal(all(view.shell).includes(loading),false,'obsolete loader must not cover or replace the visible scene');
 assert.equal(all(view.shell).includes(broken),false);
 assert.equal(first.style.opacity,'1');
});

test('reveals a late-loaded initial scene if the newer background fails',()=>{
 const view=setup({...payload(),sequence:[
  {type:'IMAGE',target:'BACKGROUND',action:'SHOW',assetType:'SCENE',src:'/slow.png'},
  {type:'LINE',lineMode:'NARRATION',text:'처음.'},
  {type:'IMAGE',target:'BACKGROUND',action:'REPLACE',assetType:'SCENE',src:'/broken.png'},
  {type:'LINE',lineMode:'NARRATION',text:'다음.'},{type:'END'}
 ]},{animated:true});
 const slow=all(view.shell).find(item=>item.src==='/slow.png');
 view.surfaceClick();slow.onload();
 const broken=all(view.shell).find(item=>item.src==='/broken.png');broken.onerror();
 assert.ok(all(view.shell).includes(slow));
 assert.equal(slow.style.opacity,'1');
});

test('slides the nameplate from the left and prevents a stale exit from hiding the next speaker',()=>{
 const view=setup({...payload(),sequence:[
  {type:'LINE',speaker:'GUIDE',text:'어서 와.'},
  {type:'LINE',lineMode:'NARRATION',text:'바람이 분다.'},
  {type:'LINE',speaker:'PLAYER',text:'반가워.'},
  {type:'END'}
 ]},{animated:true});
 const nameplate=all(view.shell).find(item=>item.className.includes('dialogue-speaker-nameplate'));
 const entrance=nameplate.animations.at(-1);
 assert.ok(entrance);assert.match(entrance.frames[0].transform,/-[0-9]+px/);entrance.finish();
 view.surfaceClick();
 const exit=nameplate.animations.at(-1);
 assert.equal(nameplate.hidden,false,'finish the slide before hiding');
 view.surfaceClick();exit.finish();
 assert.equal(nameplate.hidden,false);assert.equal(nameplate.textContent,'카엘');
});
