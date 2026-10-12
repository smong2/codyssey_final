export const LEVELS = [
  ['########','#......#','#....G.#','#..B...#','#P.....#','#......#','########'],
  ['########','#......#','#.G.G..#','#..B.B.#','#...P..#','#......#','########'],
  ['########','#......#','#.#G.G.#','#.#B...#','#..B.P.#','#......#','########'],
];
export const key = (x,y) => `${x},${y}`;
export function parseLevel(lines) {
  const walls = new Set(), goals = new Set(), boxes = new Set();
  let player = [0,0];
  lines.forEach((row,y) => [...row].forEach((ch,x) => {
    const k = key(x,y);
    if (ch === '#') walls.add(k);
    if (ch === 'G' || ch === '*') goals.add(k);
    if (ch === 'B' || ch === '*') boxes.add(k);
    if (ch === 'P') player = [x,y];
  }));
  return { walls, goals, boxes, player, width: lines[0].length, height: lines.length, moves: 0, pushes: 0 };
}
export function move(state, dx, dy) {
  const [x,y] = state.player, nx = x+dx, ny = y+dy, next = key(nx,ny);
  if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height || state.walls.has(next)) return state;
  const boxes = new Set(state.boxes);
  let pushes = state.pushes;
  if (boxes.has(next)) {
    const behind = key(nx+dx,ny+dy);
    if (state.walls.has(behind) || boxes.has(behind) || nx+dx < 0 || ny+dy < 0 || nx+dx >= state.width || ny+dy >= state.height) return state;
    boxes.delete(next); boxes.add(behind); pushes++;
  }
  return { ...state, player: [nx,ny], boxes, moves: state.moves+1, pushes };
}
export function solved(state) { return [...state.goals].every(goal => state.boxes.has(goal)); }
