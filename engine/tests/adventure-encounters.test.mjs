import test from 'node:test';
import assert from 'node:assert/strict';
import * as encounterApi from '../src/scenes/adventure-encounters.mjs';

test('walking into a hidden NPC encounter opens it once and never triggers at spawn',()=>{
 const {takeAdventureEncounter,ADVENTURE_NPC_ENCOUNTER_RADIUS}=encounterApi;
 assert.equal(typeof takeAdventureEncounter,'function');
 const encounters=[{npc:{id:'CH16',name:'티아'},point:{x:1000,y:800},triggered:false}];
 assert.ok(ADVENTURE_NPC_ENCOUNTER_RADIUS<220);
 assert.equal(takeAdventureEncounter(encounters,{x:0,y:0}),null);
 assert.equal(takeAdventureEncounter(encounters,{x:1000-ADVENTURE_NPC_ENCOUNTER_RADIUS,y:800}),encounters[0].npc);
 assert.equal(takeAdventureEncounter(encounters,{x:1000,y:800}),null);
});
