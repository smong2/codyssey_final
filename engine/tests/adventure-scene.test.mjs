import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAdventure} from '../src/scenes/AdventureScene.mjs';

const alternateMap={world:'./design-assets/map/test-world.webp',mask:'./design-assets/map/test-mask.png',foreground:'./design-assets/map/test-front.webp',spawn:{x:500,y:600},zoom:1,placement:{wallClearance:24,forbiddenZones:[]}};
test('objective routes follow the connected safe area around a wall',async()=>{
 const {reachableSafeRoutes}=await import('../src/core/adventure-mission.mjs');
 assert.equal(typeof reachableSafeRoutes,'function');
 const {canWalk}=await import('../src/core/collision.mjs'),pixels=new Uint8ClampedArray(80*80*4).fill(255);
 for(let y=20;y<80;y++)for(let x=39;x<=41;x++)pixels.fill(0,(y*80+x)*4,(y*80+x+1)*4);
 const mask={width:80,height:80,worldWidth:1600,worldHeight:1600,pixels},spawn={x:300,y:1200},target={x:1300,y:1200};
 const [route]=reachableSafeRoutes(mask,spawn,[target]);
 assert.deepEqual(route[0],spawn);assert.deepEqual(route.at(-1),target);
 assert.ok(route.some(point=>point.y<400));
 assert.ok(route.every(point=>canWalk(mask,point.x,point.y)));
});
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
test('adventure loads only the selected player artwork, even with legacy NPC options',t=>{
 const {strips}=sceneHarness(t,{characterId:'CH02',npcs:[{id:'CH16',name:'티아'}]});
 assert.equal(strips.find(([key])=>key==='walk-S')[1],'./design-assets/sd_character/sera_s_strip_008.png');
 assert.equal(strips.some(([key])=>key.startsWith('npc-')),false);
 assert.equal(strips.length,8);
});
test('legacy NPC options cannot open a dialogue or pause the adventure timer',t=>{
 const previousDocument=globalThis.document;globalThis.document={hidden:false};t.after(()=>{globalThis.document=previousDocument;});
 let opened=0;const {scene}=sceneHarness(t,{npcs:[{id:'CH16',name:'티아'}],onEncounter:()=>opened++});
 scene.player={x:1000,y:800,setPosition(x,y){this.x=x;this.y=y;},setFrame(){},anims:{stop(){}}};
 scene.npcEncounters=[{npc:{id:'CH16',name:'티아'},point:{x:1000,y:800},triggered:false}];
 scene.keys=Object.fromEntries(['W','A','S','D','UP','DOWN','LEFT','RIGHT'].map(key=>[key,{isDown:false}]));
 scene.active=true;scene.remainingMs=120000;
 scene.update(0,16);
 assert.equal(opened,0);assert.equal(scene.paused,false);assert.equal(scene.remainingMs,119984);
 scene.pause(false);scene.update(0,16);
 assert.equal(opened,0);assert.equal(scene.remainingMs,119968);
});
test('investigation exposes its busy state and preserves an overlapping clue overlay pause',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {scene,view,states}=sceneHarness(t);
 const previousDocument=globalThis.document;globalThis.document={hidden:false};t.after(()=>{globalThis.document=previousDocument;});
 scene.keys=Object.fromEntries(['W','A','S','D','UP','DOWN','LEFT','RIGHT'].map(k=>[k,{isDown:false}]));
 scene.active=true;scene.remainingMs=120000;scene.objectives=[{id:'one',x:500,y:600}];scene.player={x:0,y:0,anims:{stop(){}},setFrame(){}};
 assert.equal(view.investigate(),true);assert.equal(states.at(-1).investigating,true);assert.equal(states.at(-1).paused,true);
 scene.update(0,1000);assert.equal(scene.remainingMs,120000);
 view.pause(true);t.mock.timers.tick(999);assert.equal(states.at(-1).investigating,true);t.mock.timers.tick(1001);
 assert.equal(states.at(-1).investigating,false);assert.equal(states.at(-1).paused,true);
 scene.update(0,1000);assert.equal(scene.remainingMs,120000);
 view.pause(false);assert.equal(states.at(-1).paused,false);
});
test('an unlocked student without delivered SD art fails safely before starting Phaser',()=>{
 const states=[];const view=mountAdventure({}, {characterId:'CH03',onState:state=>states.push(state)});assert.match(states[0].error,/SD 이미지/);assert.equal(view.start(),false);view.destroy();
});
