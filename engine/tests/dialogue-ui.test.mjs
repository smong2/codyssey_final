import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDialogueUI} from '../src/ui/dialogue.mjs';
import {createAdmissionPreviewPayload} from '../src/core/preview-dialogue.mjs';

function node(tag,text='',className=''){
 const item={tag,text,className,src:'',alt:'',type:'',style:{},children:[],append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},remove(){},setAttribute(){},get textContent(){return [this.text,...this.children.map(child=>child.textContent)].filter(Boolean).join(' ');}};
 item.classList={toggle(name,enabled){const names=new Set(item.className.split(/\s+/).filter(Boolean));if(enabled)names.add(name);else names.delete(name);item.className=[...names].join(' ');}};
 return item;
}
const all=element=>[element,...element.children.flatMap(all)];
function setup(payload,options={}){
 const shell=node('main');let history=null,completed=null,skipped=null;
 const ui=createDialogueUI({el:node,btn:(text,onclick,className)=>Object.assign(node('button',text,className),{onclick}),shell,
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

test('renders shared dialogue controls, imagery, choice reactions, history, and explicit completion',()=>{
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
 assert.equal(all(view.shell).some(item=>item.className.includes('life-dialogue')&&item.hidden),true);
 view.click('응');
 assert.match(view.shell.textContent,/반가워/);
 view.surfaceClick();
 assert.match(view.shell.textContent,/좋은 만남이다/);
 view.surfaceClick();view.surfaceClick();
 assert.deepEqual(view.completed,{completionMode:'COMPLETE',selectedChoices:[{choiceNodeId:'C1',choiceId:'A'}]});
 view.click('대화기록');
 assert.match(view.history.body.textContent,/저녁 바람이 분다/);
 assert.match(view.history.body.textContent,/선택 · 응/);
});

test('shows skip only when the service payload permits it and passes selected choices to callback',()=>{
 const view=setup(payload(true));
 view.click('건너뛰기');
 assert.deepEqual(view.skipped,{completionMode:'SKIP',selectedChoices:[]});
 assert.equal(view.completed,null);
});

test('shows the same down arrow at the end and advances to completion from a panel click',()=>{
 const view=setup({...payload(),sequence:[
  {type:'LINE',lineMode:'DIALOGUE',speaker:'GUIDE',text:'마지막 인사'},
  {type:'END'}
 ]});
 view.surfaceClick();
 const frame=all(view.shell).find(item=>item.tag==='section'&&item.className.includes('life-dialogue'));
 assert.ok(all(frame).some(item=>item.className.includes('dialogue-advance-indicator')&&item.text==='↓'));
 assert.equal(all(frame).some(item=>item.tag==='button'&&['다음','다음 장면','이야기 마치기'].includes(item.text)),false);
 assert.equal(view.completed,null);
 view.surfaceClick();
 assert.deepEqual(view.completed,{completionMode:'COMPLETE',selectedChoices:[]});
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
 assert.equal(nameplate.style.backgroundImage,'url("./design-assets/ui/BT04_blank_pale_green.png")');
 const arrow=all(frame).find(item=>item.className.includes('dialogue-advance-indicator'));
 assert.ok(arrow);
 assert.equal(arrow.text,'↓');
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
 const compactRule=rules.at(-1);
 assert.match(compactRule,/width:clamp\(164px,28vw,224px\)/);
 assert.match(compactRule,/aspect-ratio:1940\s*\/\s*311/);
 assert.match(compactRule,/height:auto/);
 const frameRules=[...css.matchAll(/#shell\.dialogue-preview-page>\.life-dialogue,#shell\.admission-story-page>\.life-dialogue\{([^}]*)\}/g)].map(match=>match[1]);
 const frameRule=frameRules.at(-1)??'';
 assert.match(frameRule,/border:1px solid #b79555/);
 const choiceRule=css.match(/\.dialogue-choice-panel-right \.dialogue-choice-nameplate\{([^}]*)\}/)?.[1]??'';
 assert.match(choiceRule,/background-size:contain/);
});

test('keeps the NPC nameplate visible while the choice screen replaces the dialogue panel',()=>{
 const view=setup(payload());
 view.surfaceClick();
 view.surfaceClick();
 const frame=all(view.shell).find(item=>item.className.includes('life-dialogue'));
 const nameplate=all(view.shell).find(item=>item.className.includes('dialogue-speaker-nameplate'));
 assert.equal(frame.hidden,true);
 assert.ok(nameplate);
 assert.equal(nameplate.hidden,false);
 assert.ok(view.shell.children.includes(nameplate));
});
