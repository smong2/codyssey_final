import test from 'node:test';
import assert from 'node:assert/strict';
import {addAdventureNpc} from '../src/scenes/adventure-actors.mjs';

test('a map NPC has a character sprite, ground shadow and clickable name above its head',()=>{
 const sprites=[],labels=[],shadows=[],callbacks=[];
 const visual=()=>({setOrigin(){return this;},setDisplaySize(){return this;},setDepth(value){this.depth=value;return this;},setInteractive(){return this;},on(type,callback){callbacks.push(callback);return this;}});
 const scene={add:{sprite:(...args)=>{const v=visual();sprites.push({args,v});return v;},text:(...args)=>{const v=visual();labels.push({args,v});return v;},ellipse:(...args)=>{const v=visual();shadows.push({args,v});return v;}}};let interacted=0;
 addAdventureNpc(scene,{id:'CH16',name:'티아'},{x:1000,y:800},()=>interacted++);
 assert.deepEqual(sprites[0].args,[1000,800,'npc-CH16',1]);assert.equal(sprites[0].v.depth,10);
 assert.equal(shadows.length,1);assert.ok(shadows[0].v.depth<sprites[0].v.depth);
 assert.match(labels[0].args[2],/티아/);assert.ok(labels[0].args[1]<800);
 assert.equal(callbacks.length,2);callbacks[0]();callbacks[1]();assert.equal(interacted,2);
});
