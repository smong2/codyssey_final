import { makeRng } from '../shared/rng.js';
export const RULES = [
  { title: '푸른 원은 베기 · 나머지는 지나치기', decide: t => t.color === 'blue' && t.shape === 'circle' ? 'slash' : 'none' },
  { title: '붉은 것은 지나치기 · 삼각형은 막기 · 원은 베기', decide: t => t.color === 'red' ? 'none' : t.shape === 'triangle' ? 'block' : 'slash' },
  { title: '붉은 원은 막기 · 황금 삼각형은 베기 · 나머지는 지나치기', decide: t => t.color === 'red' && t.shape === 'circle' ? 'block' : t.color === 'gold' && t.shape === 'triangle' ? 'slash' : 'none' },
];
export function targetAt(seed, wave, index) {
  const random = makeRng(`${seed}:target:${wave}:${index}`);
  return { color: ['blue','gold','red'][Math.floor(random()*3)], shape: random() < 0.5 ? 'circle' : 'triangle' };
}
export function judge(wave, target, action) { return RULES[wave].decide(target) === action; }
export function acceptResponse(state, wave, target, action) {
  if (state.responded) return state;
  const correct = judge(wave,target,action);
  return { ...state, responded: true, correct: state.correct + Number(correct), mistakes: state.mistakes + Number(!correct), judged: state.judged + 1 };
}
