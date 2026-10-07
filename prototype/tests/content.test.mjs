import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const read=async name=>JSON.parse(await readFile(new URL('../'+name,import.meta.url),'utf8'));
test('all 32 original profiles can be browsed and only Kael can start',async()=>{
 const chars=await read('characters.json');assert.equal(chars.length,32);assert.equal(new Set(chars.map(c=>c.id)).size,32);
 assert.equal(chars.filter(c=>c.gender==='male').length,16);assert.equal(chars.filter(c=>c.gender==='female').length,16);
 assert.deepEqual(chars.filter(c=>c.playable).map(c=>c.id),['CH01']);
 for(const c of chars){assert.ok(c.name&&c.age&&c.title&&c.personality&&c.strength&&c.difficulty&&c.quote);await access(new URL('../'+c.asset,import.meta.url));}
});
test('new story content contains both first meetings, four memories and complete small-choice branches',async()=>{
 const c=await read('content.json');assert.ok(c.dialogue.valentinus?.length>3);assert.ok(c.dialogue.sion?.length>5);assert.equal(c.reflections.length,4);
 assert.equal(c.bernTalk.choices.length,3);assert.ok(c.bernTalk.choices.every(x=>x.player&&x.reaction.length>=2));
 assert.ok(c.dialogue.bernRepeat.length===2);assert.ok(c.map.objects.some(o=>o.id==='sunlight'));
 assert.deepEqual(Object.keys(c.knowledge).sort(),['glassFlowerSoil','greenhouseSunlight','runeLightBroken']);
});
test('before investigation dialogue never leaks the greenhouse cause',async()=>{
 const c=await read('content.json');for(const scene of ['sion','greenhouse']){
  assert.ok(c.dialogue[scene]);const text=c.dialogue[scene].map(l=>l.text).join(' ');
  assert.equal(/룬|배열|깊은|흐름/.test(text),false);
 }
});
