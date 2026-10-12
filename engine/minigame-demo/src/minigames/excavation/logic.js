import { makeRng } from '../shared/rng.js';

export const SIZE = 8;
export const SHAPES = [
  [[0,0]], [[0,0],[1,0]], [[0,0],[0,1]],
  [[0,0],[1,0],[2,0]], [[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[0,1]], [[0,0],[1,0],[1,1]],
  [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[1,1]],
];
export function canPlace(board, shape, x, y) {
  return shape.every(([dx,dy]) => x+dx >= 0 && x+dx < SIZE && y+dy >= 0 && y+dy < SIZE && !board[(y+dy)*SIZE+x+dx]);
}
export function anyPlacement(board, shape) {
  for (let y=0; y<SIZE; y++) for (let x=0; x<SIZE; x++) if (canPlace(board,shape,x,y)) return true;
  return false;
}
export function place(board, cracks, shape, x, y) {
  if (!canPlace(board,shape,x,y)) return null;
  const next = [...board], nextCracks = { ...cracks };
  shape.forEach(([dx,dy]) => { next[(y+dy)*SIZE+x+dx] = 1; });
  const rows = [], cols = [];
  for (let row=0; row<SIZE; row++) if (next.slice(row*SIZE,row*SIZE+SIZE).every(Boolean)) rows.push(row);
  for (let col=0; col<SIZE; col++) if (Array.from({length:SIZE},(_,row)=>next[row*SIZE+col]).every(Boolean)) cols.push(col);
  const clearing = new Set();
  rows.forEach(row => { for (let col=0; col<SIZE; col++) clearing.add(row*SIZE+col); });
  cols.forEach(col => { for (let row=0; row<SIZE; row++) clearing.add(row*SIZE+col); });
  clearing.forEach(index => {
    if (nextCracks[index] > 1) nextCracks[index]--;
    else { next[index] = 0; delete nextCracks[index]; }
  });
  return { board: next, cracks: nextCracks, cleared: rows.length + cols.length };
}
export function nextChoices(seed, draw, stage, board) {
  const rng = makeRng(`${seed}:excavation:${draw}`);
  const pool = SHAPES.slice(0, stage === 0 ? 7 : SHAPES.length);
  const choices = Array.from({length:3}, () => pool[Math.floor(rng()*pool.length)]);
  if (!choices.some(shape => anyPlacement(board,shape)) && anyPlacement(board,SHAPES[0])) choices[2] = SHAPES[0];
  return choices;
}
