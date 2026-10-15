import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
test('catalogue lists locked students as silhouettes in both selection and bag without allowing a new run',async()=>{
 const model=await import('../src/core/catalogue.mjs').catch(()=>null);
 assert.ok(model,'catalogue model must exist');
 const meta={unlockedCharacters:['CH01'],pets:[]};
 const selection=model.studentCards(meta,'selection');
 assert.equal(selection.length,32);
 assert.equal(selection.find(c=>c.id==='CH03').selectable,false);
 assert.equal(selection.find(c=>c.id==='CH03').muted,true);
 assert.equal(model.studentCards(meta,'bag').find(c=>c.id==='CH03').muted,true);
 assert.equal(model.studentCards(meta,'bag').find(c=>c.id==='CH01').muted,false);
 for(const c of selection)await access(new URL('../../asset/character/'+c.fullbody,import.meta.url));
 const pets=model.petCards(meta);assert.equal(pets.length,10);assert.equal(pets[0].muted,false);assert.equal(pets[1].muted,true);
 assert.deepEqual(meta,{unlockedCharacters:['CH01'],pets:[]});
});
