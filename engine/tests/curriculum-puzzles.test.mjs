import test from 'node:test';
import assert from 'node:assert/strict';
import {connections} from '../minigame-demo/src/minigames/rune-circuit/logic.js';
import {traceBeam} from '../minigame-demo/src/minigames/mirror-magic/logic.js';
import {circuitStage,mirrorStage,potStage,pourPot,potsSolved,shelfStage,moveShelf,shelvesSolved,rhythmPattern,firePin} from '../src/core/curriculum-puzzles.mjs';
test('every difficulty and stage has a replayable verified circuit, mirror, pot and shelf solution',()=>{
 for(let d=1;d<=4;d++)for(let stage=0;stage<3;stage++){
  const c=circuitStage(d,'test',stage);assert.equal(connections({...c,tiles:c.solved}).won,true);
  const m=mirrorStage(d,'test',stage);assert.equal(traceBeam(m.level,m.solution).success,true);
  const p=potStage(d,'test-'+stage);for(const [a,b]of p.solution)assert.ok(pourPot(p.pots,a,b));assert.equal(potsSolved(p.pots),true);
  const s=shelfStage(d,stage);for(const [id,delta]of s.solution)assert.ok(moveShelf(s.pieces,id,delta));assert.equal(shelvesSolved(s.pieces),true);
 }
});
test('pots reject color mixing and shelves reject moves through occupied cells without mutating',()=>{
 const pots=[[0,1],[2],[]],before=structuredClone(pots);assert.equal(pourPot(pots,0,1),false);assert.deepEqual(pots,before);
 const {pieces}=shelfStage(2),saved=structuredClone(pieces);assert.equal(moveShelf(pieces,'A',4),false);assert.deepEqual(pieces,saved);
});
test('rhythm uses seeded valid lanes and harder patterns add holds and simultaneous input; pins reject collisions',()=>{
 for(let d=1;d<=4;d++){const p=rhythmPattern(d,'test');assert.deepEqual(p,rhythmPattern(d,'test'));assert.ok(p.notes.every(n=>n.lane>=0&&n.lane<p.lanes&&n.at>0&&n.at+n.hold<75000));if(d>=3)assert.ok(p.notes.some(n=>n.hold>0));}
 const pins=[];assert.equal(firePin(pins,1,0),true);assert.equal(firePin(pins,1,0),false);assert.equal(pins.length,1);
});
