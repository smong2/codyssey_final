import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAdventure} from '../src/scenes/AdventureScene.mjs';

const alternateMap={world:'./design-assets/map/test-world.webp',mask:'./design-assets/map/test-mask.png',foreground:'./design-assets/map/test-front.webp',spawn:{x:500,y:600},zoom:1,placement:{wallClearance:24,forbiddenZones:[]}};
function sceneHarness(t,options={}){
 const previous=globalThis.Phaser,loads=[],strips=[];let scene;
 globalThis.Phaser={AUTO:0,Scale:{RESIZE:0},Scene:class{},Game:class{
  constructor(config){scene=new config.scene[0]();scene.load={image:(...args)=>loads.push(args),spritesheet:(...args)=>strips.push(args)};scene.preload();this.scene={getScene:()=>scene};}
  destroy(){}
 }};
 t.after(()=>{globalThis.Phaser=previous;});
 const states=[],finishes=[];
 const view=mountAdventure({clientWidth:800,clientHeight:360},{map:alternateMap,startData:{locationId:'library',objectiveCount:1,durationSeconds:120,seed:'test'},...options,onReady:()=>{},onState:s=>states.push(s),onFinish:(...r)=>finishes.push(r)});
 return {scene,view,loads,strips,states,finishes};
}
test('adventure loads all three layers from the selected map configuration',t=>{
 const {loads}=sceneHarness(t);
 assert.deepEqual(loads,[['world','./design-assets/map/test-world.webp'],['mask','./design-assets/map/test-mask.png'],['foreground','./design-assets/map/test-front.webp']]);
});
test('adventure loads only the selected player artwork; NPCs are invisible encounter points',t=>{
 const {strips}=sceneHarness(t,{characterId:'CH02',npcs:[{id:'CH16',name:'티아'}]});
 assert.equal(strips.find(([key])=>key==='walk-S')[1],'./design-assets/sd_character/sera_s_strip_008.png');
 assert.equal(strips.some(([key])=>key.startsWith('npc-')),false);
 assert.equal(strips.length,8);
});
test('walking into an NPC location automatically pauses for dialogue only once',t=>{
 const previousDocument=globalThis.document;globalThis.document={hidden:false};t.after(()=>{globalThis.document=previousDocument;});
 let opened=0;const {scene}=sceneHarness(t,{npcs:[{id:'CH16',name:'티아'}],onEncounter:()=>opened++});
 scene.player={x:1000,y:800,setPosition(x,y){this.x=x;this.y=y;},setFrame(){},anims:{stop(){}}};
 scene.npcEncounters=[{npc:{id:'CH16',name:'티아'},point:{x:1000,y:800},triggered:false}];
 scene.keys=Object.fromEntries(['W','A','S','D','UP','DOWN','LEFT','RIGHT'].map(key=>[key,{isDown:false}]));
 scene.active=true;scene.remainingMs=120000;
 scene.update(0,16);
 assert.equal(opened,1);assert.equal(scene.paused,true);
 scene.pause(false);scene.update(0,16);
 assert.equal(opened,1);
});
test('investigation exposes its busy state and preserves an overlapping dialogue pause',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {scene,view,states}=sceneHarness(t);
 const previousDocument=globalThis.document;globalThis.document={hidden:false};t.after(()=>{globalThis.document=previousDocument;});
 scene.keys=Object.fromEntries(['W','A','S','D','UP','DOWN','LEFT','RIGHT'].map(k=>[k,{isDown:false}]));
 scene.active=true;scene.remainingMs=120000;scene.objectives=[{id:'one',x:500,y:600}];scene.player={x:0,y:0,anims:{stop(){}},setFrame(){}};
 assert.equal(view.investigate(),true);assert.equal(states.at(-1).investigating,true);assert.equal(states.at(-1).paused,true);
 scene.update(0,1000);assert.equal(scene.remainingMs,120000);
 view.pause(true);t.mock.timers.tick(2001);
 assert.equal(states.at(-1).investigating,false);assert.equal(states.at(-1).paused,true);
 scene.update(0,1000);assert.equal(scene.remainingMs,120000);
 view.pause(false);assert.equal(states.at(-1).paused,false);
});
test('an unlocked student without delivered SD art fails safely before starting Phaser',()=>{
 const states=[];const view=mountAdventure({}, {characterId:'CH03',onState:state=>states.push(state)});assert.match(states[0].error,/SD 이미지/);assert.equal(view.start(),false);view.destroy();
});
