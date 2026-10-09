import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, collectHerb, inspectPlant, recoverWorld, validateState } from '../state.mjs';
import { connected, rotate, initialPuzzle } from '../puzzle.mjs';
import { loadSave, saveState } from '../storage.mjs';
import {readFile,access} from 'node:fs/promises';

test('조사는 Knowledge, 채집은 Item이며 획득은 중복되지 않는다',()=>{
 const s=freshState(); inspectPlant(s); collectHerb(s); collectHerb(s);
 assert.deepEqual(s.knowledge,['glassFlowerSoil']); assert.equal(s.herbs,1); assert.equal(s.restored,false);
});
test('퍼즐은 시작/도착의 실제 연결로 판정한다',()=>{
 const p=initialPuzzle(); assert.equal(connected(p),false);
 p.rotations=p.solution.slice(); assert.equal(connected(p),true);
 const saved=p.rotations[1]; rotate(p,1); assert.equal(connected(p),false); p.rotations[1]=saved;
 assert.equal(connected(p),true);
});
test('수집하지 않아도 룬 회복이 가능하고 여러 번 해결해도 기록은 하나다',()=>{
 const s=freshState(); recoverWorld(s); recoverWorld(s); assert.equal(s.restored,true); assert.equal(s.herbs,0);
});
test('손상되거나 이전 버전인 저장 상태는 거부한다',()=>{
 assert.equal(validateState(null),false); assert.equal(validateState({version:0}),false);
 assert.equal(validateState(freshState()),true); const s=freshState(); s.scene='unknown'; assert.equal(validateState(s),false);
});
test('새로고침 후 이어하기는 퍼즐·선택·발견·수집 상태를 복원한다',()=>{
 let raw=null;const storage={setItem:(k,v)=>raw=v,getItem:()=>raw};const s=freshState();s.scene='adventure';inspectPlant(s);collectHerb(s);rotate(s.puzzle,1);s.choice='time';
 assert.equal(saveState(s,storage),true);assert.deepEqual(loadSave(storage).state,s);
});
test('저장 손상과 저장 거부를 처리한다',()=>{
 assert.ok(loadSave({getItem:()=>'{bad'}).error);assert.equal(loadSave({getItem:()=>null}).state,null);
 assert.equal(saveState(freshState(),{setItem:()=>{throw Error('quota');}}),false);
});
test('JSON의 모든 이미지와 SD 방향 파일이 존재한다',async()=>{
 const c=JSON.parse(await readFile(new URL('../content.json',import.meta.url),'utf8'));
 await Promise.all([...Object.values(c.assets),...c.sd.directions.map(d=>c.sd.prefix+d+c.sd.suffix)].map(p=>access(new URL('../'+p,import.meta.url))));
 assert.ok(c.choices.every(x=>['together','time','ask'].includes(x.id)));
});
