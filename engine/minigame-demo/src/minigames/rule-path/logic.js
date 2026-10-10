export const LEVELS = [
  { rows:['#######','#S.K..#','#.#.#.#','#..D.G#','#.....#','#######'], requireDoor:true, colorRule:false, energy:Infinity, rune:null },
  { rows:['#######','#S...K#','#.#.#.#','#...#.#','#D..G.#','#######'], requireDoor:true, colorRule:true, energy:Infinity, rune:null, colorOverrides:{'4,1':'gold'} },
  { rows:['########','#S..#..#','#.#.K..#','#.#.#D.#','#R....G#','#......#','########'], requireDoor:true, colorRule:true, energy:14, rune:[1,4], colorOverrides:{'2,1':'gold'} },
];
export const key = (x,y) => `${x},${y}`;
export function locate(level, symbol) {
  for(let y=0;y<level.rows.length;y++) for(let x=0;x<level.rows[y].length;x++) if(level.rows[y][x]===symbol) return [x,y];
  return null;
}
export function tileColor(level,[x,y]) {
  // Coordinates, not palette names, carry the rule; special tiles have colors too.
  return level.colorOverrides?.[key(x,y)] ?? ((x+y)%2 ? 'blue' : 'gold');
}
export function addStep(level,path,point) {
  const last=path.at(-1);
  if(Math.abs(last[0]-point[0])+Math.abs(last[1]-point[1])!==1) return path;
  const [x,y]=point;
  if(y<0||y>=level.rows.length||x<0||x>=level.rows[0].length||level.rows[y][x]==='#') return path;
  return [...path,point];
}
export function evaluate(level,path) {
  const start=locate(level,'S'),goal=locate(level,'G');
  if(!path.length||key(...path[0])!==key(...start)) return {ok:false,reason:'시작점부터 경로를 계획하세요'};
  let hasKey=false,passedDoor=false,passedRune=false;
  for(let i=1;i<path.length;i++) {
    const [x,y]=path[i];
    if(addStep(level,[path[i-1]],path[i]).length!==2) return {ok:false,reason:'인접한 통로만 이어야 합니다'};
    const tile=level.rows[y][x];
    if(level.colorRule&&tileColor(level,path[i])===tileColor(level,path[i-1])) return {ok:false,reason:'같은 색 발판을 연속으로 밟았습니다'};
    if(tile==='K') hasKey=true;
    if(tile==='D') { if(!hasKey) return {ok:false,reason:'열쇠를 먼저 찾아야 문이 열립니다'}; passedDoor=true; }
    if(level.rune&&x===level.rune[0]&&y===level.rune[1]) passedRune=true;
    if(i>level.energy) return {ok:false,reason:'마력이 부족합니다'};
  }
  if(key(...path.at(-1))!==key(...goal)) return {ok:false,reason:'마지막 칸이 목표 지점이어야 합니다'};
  if(level.requireDoor&&!passedDoor) return {ok:false,reason:'문을 통과해야 합니다'};
  if(level.rune&&!passedRune) return {ok:false,reason:'별 룬을 지나야 합니다'};
  return {ok:true,reason:'모든 조건 충족'};
}
