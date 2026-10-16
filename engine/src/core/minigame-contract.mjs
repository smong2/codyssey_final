export const MINIGAME_OUTCOMES = Object.freeze(['success', 'failure', 'greatSuccess', 'timeout', 'quit']);

export function difficultyForStat(value) {
  if (!Number.isFinite(value) || value < 0 || value > 500) throw new Error('성장 스탯 범위가 올바르지 않습니다.');
  if (value <= 100) return 1;
  if (value <= 200) return 2;
  if (value <= 350) return 3;
  return 4;
}

export function playDifficultyFor(rewardDifficulty, consecutiveFailures=0) {
  if (!Number.isInteger(rewardDifficulty) || rewardDifficulty < 1 || rewardDifficulty > 4 || !Number.isInteger(consecutiveFailures) || consecutiveFailures < 0) throw new Error('플레이 난이도 입력이 올바르지 않습니다.');
  const reduction = consecutiveFailures >= 4 ? 2 : consecutiveFailures >= 2 ? 1 : 0;
  return Math.max(1, rewardDifficulty - reduction);
}

const REWARD_STATS=['knowledge','expression','dexterity','exploration','magic'];
export function validateGrowthRewardConfig(value) {
  if (!value || typeof value !== 'object' || !value.rewardMultiplier || typeof value.rewardMultiplier !== 'object' || Array.isArray(value.rewardMultiplier)) throw new Error('성장 보정 설정이 올바르지 않습니다.');
  const rewardMultiplier={};
  for (const stat of REWARD_STATS) {
    const amount=value.rewardMultiplier[stat] ?? 1;
    if (!Number.isFinite(amount) || amount < .5 || amount > 1 || Math.round(amount*10)!==amount*10) throw new Error('성장 보정 배율은 0.5~1.0 사이 0.1 단위여야 합니다.');
    rewardMultiplier[stat]=amount;
  }
  return {version:Number.isInteger(value.version)?value.version:1,updatedAt:typeof value.updatedAt==='string'?value.updatedAt:null,updatedBy:typeof value.updatedBy==='string'?value.updatedBy:null,rewardMultiplier};
}

export function createMinigameStartData({gameId, locationId, statValue, seed, maxDurationMs = 180000, rewardInputs = null, consecutiveFailures = 0}) {
  if (typeof gameId !== 'string' || !gameId || typeof locationId !== 'string' || !locationId) throw new Error('게임 ID와 장소 ID가 필요합니다.');
  if (typeof seed !== 'string' || !seed) throw new Error('재현 가능한 게임 시드가 필요합니다.');
  if (!Number.isFinite(maxDurationMs) || maxDurationMs <= 0) throw new Error('제한 시간이 올바르지 않습니다.');
  if (rewardInputs !== null && (typeof rewardInputs !== 'object' || Array.isArray(rewardInputs))) throw new Error('보상 입력은 객체 또는 null이어야 합니다.');
  const rewardDifficulty=difficultyForStat(statValue);
  return {gameId, locationId, difficulty:playDifficultyFor(rewardDifficulty,consecutiveFailures), seed, maxDurationMs, rewardInputs};
}

export function createMinigameResult(context, outcome, score, durationMs, metrics = {}) {
  if (!context || typeof context.gameId !== 'string' || !context.gameId || typeof context.locationId !== 'string' || !context.locationId || typeof context.seed !== 'string' || !context.seed) throw new Error('게임 결과의 ID, 장소 ID와 시드가 필요합니다.');
  if (!MINIGAME_OUTCOMES.includes(outcome)) throw new Error('지원하지 않는 미니게임 결과입니다.');
  if (!Number.isInteger(context.difficulty) || context.difficulty < 1 || context.difficulty > 4 || context.rewardDifficulty!==undefined&&(!Number.isInteger(context.rewardDifficulty)||context.rewardDifficulty<1||context.rewardDifficulty>4)) throw new Error('미니게임 난이도가 올바르지 않습니다.');
  if (!Number.isFinite(score) || !Number.isFinite(durationMs)) throw new Error('점수와 플레이 시간이 숫자여야 합니다.');
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) throw new Error('게임별 지표는 객체여야 합니다.');
  const rewardInputs = context.rewardInputs ?? null;
  if (rewardInputs !== null && (typeof rewardInputs !== 'object' || Array.isArray(rewardInputs))) throw new Error('보상 입력은 객체 또는 null이어야 합니다.');
  return {gameId:context.gameId, locationId:context.locationId, outcome,
    score:Math.max(0, Math.round(score)), durationMs:Math.max(0, Math.round(durationMs)),
    difficulty:context.difficulty, seed:context.seed, metrics:{...metrics}, rewardInputs};
}

export function growthForResult(outcome, difficulty, stamina, multiplier=1) {
  if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 4) throw new Error('미니게임 난이도가 올바르지 않습니다.');
  if (!Number.isFinite(multiplier)||multiplier<.5||multiplier>1) throw new Error('성장 보정 배율이 올바르지 않습니다.');
  let growth = outcome === 'greatSuccess' ? 10
    : outcome === 'success' ? difficulty + 4
    : outcome === 'failure' ? difficulty - 1
    : 0;
  const staminaMultiplier=stamina >= 10 && stamina <= 30 ? .5 : 1;
  return Math.floor(growth * multiplier * staminaMultiplier);
}
