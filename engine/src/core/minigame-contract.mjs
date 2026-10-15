export const MINIGAME_OUTCOMES = Object.freeze(['success', 'failure', 'greatSuccess', 'timeout', 'quit']);

export function difficultyForStat(value) {
  if (!Number.isFinite(value) || value < 0 || value > 500) throw new Error('성장 스탯 범위가 올바르지 않습니다.');
  if (value <= 100) return 1;
  if (value <= 200) return 2;
  if (value <= 350) return 3;
  return 4;
}

export function createMinigameStartData({gameId, locationId, statValue, seed, maxDurationMs = 180000, rewardInputs = null}) {
  if (typeof gameId !== 'string' || !gameId || typeof locationId !== 'string' || !locationId) throw new Error('게임 ID와 장소 ID가 필요합니다.');
  if (typeof seed !== 'string' || !seed) throw new Error('재현 가능한 게임 시드가 필요합니다.');
  if (!Number.isFinite(maxDurationMs) || maxDurationMs <= 0) throw new Error('제한 시간이 올바르지 않습니다.');
  if (rewardInputs !== null && (typeof rewardInputs !== 'object' || Array.isArray(rewardInputs))) throw new Error('보상 입력은 객체 또는 null이어야 합니다.');
  return {gameId, locationId, difficulty:difficultyForStat(statValue), seed, maxDurationMs, rewardInputs};
}

export function createMinigameResult(context, outcome, score, durationMs, metrics = {}) {
  if (!context || typeof context.gameId !== 'string' || !context.gameId || typeof context.locationId !== 'string' || !context.locationId || typeof context.seed !== 'string' || !context.seed) throw new Error('게임 결과의 ID, 장소 ID와 시드가 필요합니다.');
  if (!MINIGAME_OUTCOMES.includes(outcome)) throw new Error('지원하지 않는 미니게임 결과입니다.');
  if (!Number.isInteger(context.difficulty) || context.difficulty < 1 || context.difficulty > 4) throw new Error('미니게임 난이도가 올바르지 않습니다.');
  if (!Number.isFinite(score) || !Number.isFinite(durationMs)) throw new Error('점수와 플레이 시간이 숫자여야 합니다.');
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) throw new Error('게임별 지표는 객체여야 합니다.');
  const rewardInputs = context.rewardInputs ?? null;
  if (rewardInputs !== null && (typeof rewardInputs !== 'object' || Array.isArray(rewardInputs))) throw new Error('보상 입력은 객체 또는 null이어야 합니다.');
  return {gameId:context.gameId, locationId:context.locationId, outcome,
    score:Math.max(0, Math.round(score)), durationMs:Math.max(0, Math.round(durationMs)),
    difficulty:context.difficulty, seed:context.seed, metrics:{...metrics}, rewardInputs};
}

export function growthForResult(outcome, difficulty, stamina) {
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 4) throw new Error('미니게임 난이도가 올바르지 않습니다.');
  let growth = outcome === 'greatSuccess' ? 10
    : outcome === 'success' ? difficulty + 4
    : outcome === 'failure' ? difficulty - 1
    : 0;
  if (stamina >= 10 && stamina <= 30) growth = Math.floor(growth / 2);
  return growth;
}
