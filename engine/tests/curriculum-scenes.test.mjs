import test from 'node:test';
import assert from 'node:assert/strict';
import {curriculumStart,normalizeCurriculumResult} from '../src/core/curriculum.mjs';
import {CLASSES} from '../src/core/classes.mjs';

function element(tag){
 const classes=new Set();return {tag,children:[],style:{setProperty(){}},className:'',textContent:'',classList:{add:tag=>classes.add(tag),toggle(){}},append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}},replaceChildren(...nodes){this.children=[];this.append(...nodes);},setAttribute(){},remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}};
}
test('all six scene types mount at every difficulty, time out once and remove their input surfaces',async t=>{
 let now=0;const host=element('main'),previous={Phaser:globalThis.Phaser,document:globalThis.document,window:globalThis.window};
 globalThis.Phaser={Scene:class {constructor(key){this.key=key;}}};globalThis.document={createElement:element,querySelector:()=>host};globalThis.window={confirm:()=>true};t.mock.method(performance,'now',()=>now);
 try{
  const {curriculumScenes}=await import('../src/scenes/CurriculumScenes.mjs');
  for(const statValue of [50,150,250,400])for(const [index,Scene]of curriculumScenes.entries()){
   now=0;const lesson=CLASSES[index],scene=new Scene(),calls=[];let shutdown;
   scene.events={once:(_name,fn)=>shutdown=fn};scene.scene={start:key=>{calls.push(['scene',key]);shutdown();}};scene.game={events:{emit:(name,value)=>calls.push([name,value])}};
   const start=curriculumStart({gameId:lesson.id,statValue,seed:'scene-test'});scene.init(start);scene.create();const root=scene.root;
   assert.ok(host.children.includes(root));assert.ok(scene.board.children.length);if(scene.guideOverlay)scene.guideOverlay.children[0].children.at(-1).onclick();now=start.maxDurationMs+1;scene.update();scene.update();scene.quit();
   assert.equal(calls.length,2);assert.deepEqual(calls[0],['scene','home']);assert.equal(calls[1][0],'minigame:complete');assert.equal(calls[1][1].outcome,'FAIL');
   assert.equal(normalizeCurriculumResult(calls[1][1],lesson,{rewardDifficulty:start.difficulty,playDifficulty:start.difficulty}).outcome,'failure');assert.ok(root.removed);
  }
  // Play the real pot buttons through the verified witness, then confirm one final result.
  now=0;const Scene=curriculumScenes[2],scene=new Scene(),results=[];scene.events={once(){}};scene.scene={start(){}};scene.game={events:{emit:(_name,value)=>results.push(value)}};
  scene.init(curriculumStart({gameId:'spirit-pot-sort',statValue:50,seed:'touch'}));scene.create();if(scene.guideOverlay)scene.guideOverlay.children[0].children.at(-1).onclick();const solution=structuredClone(scene.puzzle.solution);
  for(const [from,to]of solution){scene.board.children[0].children[from].onclick();scene.board.children[0].children[to].onclick();}
  assert.equal(results.length,1);assert.equal(results[0].outcome,'GREAT');assert.equal(results[0].endReason,'COMPLETE');scene.finish();assert.equal(results.length,1);
  assert.deepEqual(results[0].inputLog.map(({action,fromPot,toPot})=>({action,fromPot,toPot})),solution.map(([fromPot,toPot])=>({action:'POUR',fromPot,toPot})));
 }finally{Object.assign(globalThis,previous);}
});

test('a solved mirror stays visibly rotated until the next round transition completes',async t=>{
 let now=0;const host=element('main'),previous={Phaser:globalThis.Phaser,document:globalThis.document};
 globalThis.Phaser={Scene:class{}};globalThis.document={createElement:element,querySelector:()=>host};t.mock.method(performance,'now',()=>now);
 try{
  const {curriculumScenes}=await import('../src/scenes/CurriculumScenes.mjs');const scene=new curriculumScenes[0]();
  scene.events={once(){}};scene.scene={start(){}};scene.game={events:{emit(){}}};scene.init(curriculumStart({gameId:'observatory-mirror',statValue:50,seed:'rotation'}));scene.create();
  if(scene.guideOverlay)scene.guideOverlay.children[0].children.at(-1).onclick();
  const puzzle=scene.puzzle,[x,y]=puzzle.level.mirrors[0];scene.board.children[0].children[y*puzzle.level.width+x].onclick();
  assert.equal(scene.round,1);assert.equal(scene.puzzle,puzzle,'keep the solved board visible');assert.equal(scene.puzzle.orientations[0],'/');
  assert.ok(scene.roundTransition);now=1200;scene.update();assert.notEqual(scene.puzzle,puzzle);assert.equal(scene.roundTransition,null);
 }finally{Object.assign(globalThis,previous);}
});

test('rhythm reports timing grades and does not accept input behind instructions',async t=>{
 let now=0;const host=element('main'),previous={Phaser:globalThis.Phaser,document:globalThis.document};
 globalThis.Phaser={Scene:class{}};globalThis.document={createElement:element,querySelector:()=>host};t.mock.method(performance,'now',()=>now);
 try{
  const {curriculumScenes}=await import('../src/scenes/CurriculumScenes.mjs');const scene=new curriculumScenes[1]();
  scene.events={once(){}};scene.scene={start(){}};scene.game={events:{emit(){}}};scene.init(curriculumStart({gameId:'starlight-stage',statValue:50,seed:'timing'}));scene.create();
  if(!scene.guideOverlay)scene.showGuide();scene.hitLane(0,false);assert.equal(scene.inputLog.length,0);
  scene.guideOverlay.children[0].children.at(-1).onclick();
  for(const [offset,grade] of [[0,'Excellent'],[80,'Great'],[150,'Good']]){
   const note=scene.pattern.notes.find(n=>!n.hit&&!n.missed);now=note.at+offset;scene.hitLane(note.lane,false);assert.equal(note.hit,true);assert.match(scene.feedback.textContent,new RegExp(grade));
  }
  const note=scene.pattern.notes.find(n=>!n.hit&&!n.missed);now=note.at+161;scene.update();assert.equal(note.missed,true);assert.match(scene.feedback.textContent,/Miss/);
 }finally{Object.assign(globalThis,previous);}
});

test('quit confirmation stays inside the game and pauses its timer until a choice',async t=>{
 let now=0;const host=element('main'),previous={Phaser:globalThis.Phaser,document:globalThis.document,window:globalThis.window};
 globalThis.Phaser={Scene:class {constructor(key){this.key=key;}}};globalThis.document={createElement:element,querySelector:()=>host};globalThis.window={confirm:()=>{throw new Error('browser confirm must not open');}};t.mock.method(performance,'now',()=>now);
 try{
  const {curriculumScenes}=await import('../src/scenes/CurriculumScenes.mjs');
  const scene=new curriculumScenes[2](),calls=[];let shutdown;
  scene.events={once:(_name,fn)=>shutdown=fn};scene.scene={start:key=>{calls.push(key);shutdown();}};scene.game={events:{emit:name=>calls.push(name)}};
  scene.init(curriculumStart({gameId:'spirit-pot-sort',statValue:50,seed:'quit-test'}));scene.create();
  if(scene.guideOverlay)scene.guideOverlay.children[0].children.at(-1).onclick();
  scene.quit();assert.ok(scene.quitOverlay);now=scene.startData.maxDurationMs+10;scene.update();assert.equal(calls.length,0);
  const controls=scene.quitOverlay.children[0].children.at(-1).children;
  controls[0].onclick();assert.equal(scene.quitOverlay,null);assert.equal(calls.length,0);
  scene.quit();scene.quitOverlay.children[0].children.at(-1).children[1].onclick();
  assert.deepEqual(calls,['home','minigame:quit']);
 }finally{Object.assign(globalThis,previous);}
});
