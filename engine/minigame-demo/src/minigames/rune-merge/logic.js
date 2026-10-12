import { makeRng } from '../shared/rng.js';

export const WIDTH = 7, HEIGHT = 8;
export function nextRune(seed, turn) {
  if (turn >= 8 && turn % 9 === 8) return -1; // a rare dew rune can join any neighboring tier
  const random = makeRng(`${seed}:merge:${turn}`);
  return 1 + Math.floor(random() * (turn >= 17 ? 3 : 2));
}
export function canDrop(board, column) { return column >= 0 && column < WIDTH && !board[column]; }
export function drop(board, column, tier) {
  if (!canDrop(board,column)) return null;
  const next=board.map(value=>value?{tier:value}:null);
  let row=HEIGHT-1;
  while(row>=0 && next[row*WIDTH+column]) row--;
  const token={tier};next[row*WIDTH+column]=token;
  let merges=0, highest=Math.max(0,...board);
  for(let safety=0;safety<20;safety++) {
    const current=token.tier;
    const neighbors=[[column,row+1],[column-1,row],[column+1,row],[column,row-1]]
      .filter(([x,y])=>x>=0&&x<WIDTH&&y>=0&&y<HEIGHT&&next[y*WIDTH+x]?.tier>0);
    const match=neighbors.find(([x,y])=>current===-1||next[y*WIDTH+x]?.tier===current);
    if(!match) break;
    const [mx,my]=match, combined=(current===-1?next[my*WIDTH+mx].tier:current)+1;
    next[my*WIDTH+mx]=null; token.tier=combined; merges++;
    highest=Math.max(highest,combined);
    // The token object keeps its identity through gravity and chain reactions.
    for(let x=0;x<WIDTH;x++) {
      const values=[];
      for(let y=HEIGHT-1;y>=0;y--) if(next[y*WIDTH+x]) values.push(next[y*WIDTH+x]);
      for(let y=HEIGHT-1;y>=0;y--) next[y*WIDTH+x]=values[HEIGHT-1-y]||null;
    }
    row=next.indexOf(token)/WIDTH|0;
  }
  if(token.tier===-1)token.tier=1;
  const values=next.map(value=>value?.tier||0);
  return { board:values, merges, highest:Math.max(highest,...values), danger:values.slice(0,WIDTH).some(Boolean) };
}
