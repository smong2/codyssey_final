import { makeRng, shuffle } from '../shared/rng.js';
export const WIDTH = 8, HEIGHT = 6;
const DIRECTIONS = [[1,0],[-1,0],[0,1],[0,-1]];
export function makeBoard(seed, attempt = 0) {
  const values = Array.from({ length: WIDTH * HEIGHT / 2 }, (_, i) => String.fromCharCode(65 + i % 12)).flatMap(v => [v, v]);
  for (let n=attempt;n<attempt+100;n++) {
    const board=shuffle(values,makeRng(`${seed}:link:${n}`));
    if(findMove(board)) return board;
  }
  return values;
}
export function makeChapter(seed, chapter) {
  const count=[8,10,12][chapter];
  const positions=[];
  const minX=chapter===0?2:1,maxX=chapter===0?5:chapter===1?5:6;
  for(let y=1;y<=4;y++)for(let x=minX;x<=maxX;x++)positions.push(y*WIDTH+x);
  const ordinary=count-(chapter===2?1:0);
  const values=Array.from({length:ordinary},(_,i)=>String.fromCharCode(65+i%12)).flatMap(v=>[v,v]);
  let candidate;
  for(let attempt=0;attempt<100;attempt++){
    const board=Array(WIDTH*HEIGHT).fill(null),spots=[...positions];
    if(chapter===2){board[spots[0]]='K';board[spots[5]]='K';spots.splice(5,1);spots.shift();}
    const shuffled=shuffle(values,makeRng(`${seed}:chapter:${chapter}:${attempt}`));
    spots.forEach((index,i)=>{board[index]=shuffled[i];});
    candidate=board;
    if(findMove(board))return board;
  }
  return candidate;
}
export function canLink(board, a, b, width = WIDTH, height = HEIGHT) {
  if (a === b || !board[a] || board[a] !== board[b]) return false;
  const sx = a % width + 1, sy = Math.floor(a / width) + 1;
  const tx = b % width + 1, ty = Math.floor(b / width) + 1;
  const occupied = (x,y) => x >= 1 && x <= width && y >= 1 && y <= height && board[(y-1)*width+(x-1)] !== null;
  const queue = [{ x:sx, y:sy, dir:-1, turns:0 }], seen = new Map();
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    for (let dir = 0; dir < 4; dir++) {
      const turns = node.turns + (node.dir === -1 || node.dir === dir ? 0 : 1);
      if (turns > 2) continue;
      const x = node.x + DIRECTIONS[dir][0], y = node.y + DIRECTIONS[dir][1];
      if (x < 0 || x > width + 1 || y < 0 || y > height + 1) continue;
      if (x === tx && y === ty) return true;
      if (occupied(x,y)) continue;
      const key = `${x},${y},${dir}`;
      if ((seen.get(key) ?? Infinity) <= turns) continue;
      seen.set(key, turns); queue.push({ x,y,dir,turns });
    }
  }
  return false;
}
export function findMove(board, width = WIDTH, height = HEIGHT) {
  for (let a = 0; a < board.length; a++) if (board[a])
    for (let b = a + 1; b < board.length; b++)
      if (board[a] === board[b] && canLink(board,a,b,width,height)) return [a,b];
  return null;
}
export function reshuffleRemaining(board, seed, count) {
  const random = makeRng(`${seed}:reshuffle:${count}`);
  const indices = board.flatMap((v,i) => v ? [i] : []);
  const values = indices.map(i => board[i]);
  for (let attempt = 0; attempt < 100; attempt++) {
    const shuffled = shuffle(values, random), copy = [...board];
    indices.forEach((index, i) => { copy[index] = shuffled[i]; });
    if (findMove(copy)) return copy;
  }
  return board;
}
