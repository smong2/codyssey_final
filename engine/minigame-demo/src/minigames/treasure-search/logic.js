import { makeRng } from '../shared/rng.js';
export function chooseTreasure(seed, round, size = 7) {
  const random = makeRng(`${seed}:treasure:${round}`);
  return [Math.floor(random() * size), Math.floor(random() * size)];
}
export function hint(dig, treasure, previousDistance = null) {
  const dx = treasure[0] - dig[0], dy = treasure[1] - dig[1];
  const distance = Math.abs(dx) + Math.abs(dy);
  const vertical = dy < 0 ? '북' : dy > 0 ? '남' : '';
  const horizontal = dx < 0 ? '서' : dx > 0 ? '동' : '';
  const warmth = distance === 0 ? '발견!' : distance <= 2 ? '매우 가까움' : distance <= 5 ? '가까움' : '멀리 있음';
  const trend = previousDistance === null ? '' : distance < previousDistance ? ' · 더 가까워짐' : distance > previousDistance ? ' · 멀어짐' : ' · 같은 거리';
  return { distance, direction: `${vertical}${horizontal}` || '여기', text: distance === 0 ? '보물을 찾았습니다!' : `${warmth} · ${vertical}${horizontal}쪽${trend}` };
}
export function investigate(state, point) {
  const key = point.join(',');
  if (state.visited.includes(key) || state.remaining <= 0 || state.found) return state;
  const info = hint(point, state.treasure, state.lastDistance);
  return { ...state, visited: [...state.visited, key], remaining: state.remaining - 1,
    lastDistance: info.distance, lastHint: info, found: info.distance === 0 };
}
