import test from 'node:test';
import assert from 'node:assert/strict';
import {NARRATIVE_SCENES,narrativeActor,narrativeCandidates,queueNarrative,finishNarrative,validateNarrativeState} from '../src/core/narrative.mjs';
import {createNarrativeUI} from '../src/ui/narrative.mjs';
const run=()=>({runNumber:1,characterId:'CH01',week:8,day:1,flags:{},stats:{magic:50},hiddenStats:{},storyState:{encounters:{CH25:{encounterCount:1}}},actionHistory:[{week:8,day:0,action:'rune-circuit',status:'COMPLETED'}]});
test('the authored catalogue has exactly three four-stage NPC chains and sixteen place scenes',()=>{
 assert.equal(NARRATIVE_SCENES.filter(s=>s.kind==='npc').length,12);assert.equal(NARRATIVE_SCENES.filter(s=>s.kind==='location').length,16);
 const guide=NARRATIVE_SCENES.find(s=>s.id==='NPC_GUIDE_01');assert.equal(narrativeActor(guide,'CH16').id,'CH15');
 const work=NARRATIVE_SCENES.find(s=>s.id==='NPC_WORK_01');assert.equal(narrativeActor(work,'CH25').id,'CH26');
});
test('a class visit can expose WORK only after its start week and prior encounter; missing text cannot complete it',()=>{
 const r=run(),activity=r.actionHistory[0];assert.ok(narrativeCandidates(r,activity).some(s=>s.id==='NPC_WORK_01'));
 assert.equal(narrativeCandidates(r,{...activity,week:7}).some(s=>s.id==='NPC_WORK_01'),false);
 const pending=queueNarrative(r,activity,{eventId:'NPC_WORK_01',activityToken:'1:8:0'});assert.equal(pending.content,null);assert.equal(finishNarrative(r),false);assert.equal(r.narrativeState.history.length,0);
});
test('only a received event decision opens a scene and its authored choice is committed once at scene completion',()=>{
 const r=run(),activity=r.actionHistory[0];assert.equal(queueNarrative(r,activity,null),null);
 queueNarrative(r,activity,{eventId:'NPC_WORK_01',activityToken:'1:8:0',content:{lines:[{speaker:'검증용 원고',text:'테스트 대사'}],choices:[{id:'look',label:'살펴본다',reaction:'테스트 반응',growth:{magic:2},flags:{observed:true},importantChoice:true}],closing:'테스트 공통 대화'}});
 validateNarrativeState(r.narrativeState,r);assert.equal(r.stats.magic,50);assert.equal(finishNarrative(r,'look'),true);assert.equal(r.stats.magic,52);assert.equal(finishNarrative(r,'look'),false);assert.equal(r.narrativeState.history.length,1);validateNarrativeState(r.narrativeState,r);
});
test('a fairy trade visit can expose its place scene without becoming a class or adventure',()=>{
 const r=run(),activity={week:11,day:0,action:'fairy-trade',status:'COMPLETED'};assert.ok(narrativeCandidates(r,activity).some(s=>s.id==='LOC_DRM_01'));
});

test('narrative storage rejects replayed days, forged locations and out-of-date pending scenes',()=>{
 const r=run(),activity=r.actionHistory[0];queueNarrative(r,activity,{eventId:'NPC_WORK_01',activityToken:'1:8:0',content:{lines:[{text:'검증 원고'}]}});
 for(const patch of [{locationId:'greenhouse'},{week:7},{day:1}]){const copy=structuredClone(r);Object.assign(copy.narrativeState.pending,patch);assert.throws(()=>validateNarrativeState(copy.narrativeState,copy));}
 r.storyState.history=[{week:8,day:0}];assert.throws(()=>validateNarrativeState(r.narrativeState,r));
});

test('legacy greeting portraits remain valid after switching to full-body artwork without rewriting the save',()=>{
 const r=run(),activity=r.actionHistory[0];
 const pending=queueNarrative(r,activity,{kind:'greeting',npcId:'CH16',activityToken:'1:8:0'});
 pending.actor.image='tia1_base.png';const before=structuredClone(r);
 assert.doesNotThrow(()=>validateNarrativeState(r.narrativeState,r));
 assert.deepEqual(r,before);
 pending.actor.image='kael1_base.png';assert.throws(()=>validateNarrativeState(r.narrativeState,r));
});

test('dialogue advances text without replaying the portrait entrance and saves only after neutral closing',()=>{
 const r=run(),activity=r.actionHistory[0];queueNarrative(r,activity,{eventId:'NPC_WORK_01',activityToken:'1:8:0',content:{lines:[{text:'첫 줄'},{text:'둘째 줄'}],choices:[{id:'a',label:'선택지',reaction:'반응',growth:{magic:2}}],closing:'중립 마무리'}});
 const node=(tag,text='',className='')=>({tag,text,className,children:[],append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;},get textContent(){return [this.text,...this.children.map(n=>n.textContent)].join(' ');}}),shell=node('main');let headings=0,portraits=0,saves=0;
 const ui=createNarrativeUI({el:node,btn:(text,onclick,cls)=>Object.assign(node('button',text,cls),{onclick}),shell,current:()=>r,heading(){headings++;shell.replaceChildren();},modal(){},npcStage:img=>{portraits++;return img;},onSave(){saves++;}});
 const all=n=>[n,...n.children.flatMap(all)],click=text=>all(shell).find(n=>n.tag==='button'&&n.text===text).onclick();
 ui.render();click('다음');click('다음');click('선택지');assert.equal(r.stats.magic,50);click('다음');assert.match(shell.textContent,/중립 마무리/);assert.equal(saves,0);click('이야기 마치기');assert.equal(r.stats.magic,52);assert.equal(headings,1);assert.equal(portraits,1);assert.equal(saves,1);
});

test('authored hidden growth preserves values above 100, caps at 300 and rejects decreases before any mutation',()=>{
 const received=delta=>({eventId:'NPC_WORK_01',activityToken:'1:8:0',content:{lines:[{text:'검증 원고'}],choices:[{id:'a',label:'살핀다',reaction:'반응',growth:{magic:2},hiddenDelta:{curiosity:delta}}],closing:'중립 마무리'}});
 const r=run();r.hiddenStats.curiosity=180;queueNarrative(r,r.actionHistory[0],received(1));finishNarrative(r,'a');assert.equal(r.hiddenStats.curiosity,181);
 const high=run();high.hiddenStats.curiosity=299;queueNarrative(high,high.actionHistory[0],received(3));finishNarrative(high,'a');assert.equal(high.hiddenStats.curiosity,300);
 const invalid=run();invalid.hiddenStats.curiosity=180;queueNarrative(invalid,invalid.actionHistory[0],received(-1));const before=structuredClone(invalid);assert.throws(()=>finishNarrative(invalid,'a'));assert.deepEqual(invalid,before);
});
