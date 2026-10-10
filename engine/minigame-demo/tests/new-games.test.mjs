import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZE, SHAPES, canPlace, anyPlacement, place, nextChoices } from '../src/minigames/excavation/logic.js';
import { WIDTH as MERGE_WIDTH, HEIGHT as MERGE_HEIGHT, drop, nextRune } from '../src/minigames/rune-merge/logic.js';
import { LEVELS as sealLevels, take, exposed } from '../src/minigames/seal-dismantle/logic.js';
import { makeChapter, canLink, findMove } from '../src/minigames/rune-link/logic.js';

test('excavation offers a legal piece and clears full lines',()=>{
  const board=Array(SIZE*SIZE).fill(0);
  assert.deepEqual(nextChoices('x',1,0,board),nextChoices('x',1,0,board));
  assert.ok(nextChoices('x',1,0,board).some(shape=>anyPlacement(board,shape)));
  for(let x=0;x<SIZE-1;x++)board[x]=1;
  const result=place(board,{},SHAPES[0],SIZE-1,0);
  assert.equal(result.cleared,1);
  assert.equal(result.board.slice(0,SIZE).every(value=>value===0),true);
  assert.equal(canPlace(board,SHAPES[0],0,0),false);
});

test('rune merge falls, chains across columns, and previews repeat',()=>{
  const board=Array(MERGE_WIDTH*MERGE_HEIGHT).fill(0);
  board[(MERGE_HEIGHT-1)*MERGE_WIDTH]=1;
  board[(MERGE_HEIGHT-1)*MERGE_WIDTH+1]=2;
  const result=drop(board,0,1);
  assert.equal(result.merges,2);
  assert.equal(result.highest,3);
  assert.equal(result.board[(MERGE_HEIGHT-1)*MERGE_WIDTH],3);
  assert.equal(result.board[(MERGE_HEIGHT-1)*MERGE_WIDTH+1],0);
  assert.equal(nextRune('x',10),nextRune('x',10));
});

test('every authored seal has an accessible three-of-a-kind solution',()=>{
  for(const level of sealLevels){
    let state={removed:[],tray:[]};
    for(const color of ['A','B','C','D','E']) for(const node of level.nodes.filter(item=>item.color===color)){
      assert.equal(exposed(node,state.removed),true,`${color} ${node.id}`);
      state=take(level,state,node.id);
      assert.ok(state&&!state.overflow);
    }
    assert.equal(state.won,true);
    assert.deepEqual(state.tray,[]);
  }
});

test('library chapters grow and the final key pair is immediately linkable',()=>{
  [8,10,12].forEach((pairs,chapter)=>{
    const board=makeChapter('x',chapter);
    assert.equal(board.filter(Boolean).length,pairs*2);
    assert.ok(findMove(board));
    if(chapter===2){const keys=board.flatMap((value,i)=>value==='K'?[i]:[]);assert.equal(canLink(board,...keys),true);}
  });
});
