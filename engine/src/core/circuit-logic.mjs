import { makeRng } from './rng.mjs';

export const DIRS = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
export function rotate(mask) { return ((mask << 1) & 15) | (mask >> 3); }
export function rotateTimes(mask, count) { while (count-- > 0) mask = rotate(mask); return mask; }
export function connections(board) {
  const { size, tiles, start, goal } = board;
  const reached = new Set([start[1] * size + start[0]]);
  const queue = [...reached];
  while (queue.length) {
    const pos = queue.shift(), x = pos % size, y = Math.floor(pos / size);
    for (const [dx, dy, out, inbound] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
      const next = ny * size + nx;
      if ((tiles[pos] & out) && (tiles[next] & inbound) && !reached.has(next)) {
        reached.add(next); queue.push(next);
      }
    }
  }
  const goalIndex = goal[1] * size + goal[0];
  const mandatory = board.mandatory ? board.mandatory[1] * size + board.mandatory[0] : null;
  const branchGoal = board.branchGoal ? board.branchGoal[1] * size + board.branchGoal[0] : null;
  return { reached, won: reached.has(goalIndex) && (mandatory === null || reached.has(mandatory)) && (branchGoal === null || reached.has(branchGoal)) };
}
export const LEVELS = [
  { size: 4, path: [[0,0],[1,0],[1,1],[2,1],[3,1],[3,2],[2,2],[2,3],[3,3]] },
  { size: 5, path: [[0,0],[1,0],[1,1],[2,1],[2,2],[1,2],[1,3],[2,3],[3,3],[3,4],[4,4]], fixed:[[1,1]] },
  { size: 5, path: [[0,0],[1,0],[1,1],[2,1],[3,1],[3,2],[2,2],[2,3],[3,3],[4,3],[4,4]], mandatory: [2,2], branchFrom:[3,1], branchGoal:[4,1], fixed:[[3,1]] },
];
export function buildBoard(levelIndex, seed = 'demo-seed') {
  const spec = LEVELS[levelIndex];
  const random = makeRng(`${seed}:circuit:${levelIndex}`);
  const { size, path } = spec;
  const solved = Array(size * size).fill(0).map(() => [3, 5, 6, 9, 10, 12][Math.floor(random() * 6)]);
  for (let i = 0; i < path.length; i++) {
    const [x,y] = path[i];
    let mask = 0;
    for (const neighbor of [path[i-1], path[i+1]]) {
      if (!neighbor) continue;
      const dx = neighbor[0] - x, dy = neighbor[1] - y;
      mask |= DIRS.find(d => d[0] === dx && d[1] === dy)[2];
    }
    solved[y * size + x] = mask;
  }
  if (spec.branchGoal) {
    const [fx,fy]=spec.branchFrom,[gx,gy]=spec.branchGoal;
    solved[fy*size+fx] |= DIRS.find(d=>d[0]===gx-fx&&d[1]===gy-fy)[2];
    solved[gy*size+gx] = DIRS.find(d=>d[0]===fx-gx&&d[1]===fy-gy)[2];
  }
  const start = path[0], goal = path.at(-1);
  const tiles = solved.map((mask, i) => {
    if (i === start[1] * size + start[0] || i === goal[1] * size + goal[0] || spec.branchGoal && i === spec.branchGoal[1]*size+spec.branchGoal[0] || spec.fixed?.some(([x,y])=>i===y*size+x)) return mask;
    return rotateTimes(mask, Math.floor(random() * 4));
  });
  const board = { size, tiles, start, goal, mandatory: spec.mandatory || null, branchGoal:spec.branchGoal||null, fixed:spec.fixed||[] };
  if (connections(board).won) tiles[path[1][1] * size + path[1][0]] = rotate(tiles[path[1][1] * size + path[1][0]]);
  return { ...board, solved };
}
