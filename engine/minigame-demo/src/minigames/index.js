import { RuneCircuitScene } from './rune-circuit/RuneCircuitScene.js';
import { ExcavationScene } from './excavation/ExcavationScene.js';
import { RuneLinkScene } from './rune-link/RuneLinkScene.js';
import { TrainingGuardianScene } from './training-guardian/TrainingGuardianScene.js';
import { RuneMergeScene } from './rune-merge/RuneMergeScene.js';
import { MirrorMagicScene } from './mirror-magic/MirrorMagicScene.js';
import { SealDismantleScene } from './seal-dismantle/SealDismantleScene.js';

export const registry = [
  { id:'rune-circuit', title:'룬 회로', className:'마법훈련', stat:'마법', space:'workshop', description:'회로를 돌려 두 마법진까지 마력을 보낸다.', cognition:'연결 · 분기', expectedDuration:'1~2분', scene:RuneCircuitScene },
  { id:'excavation', title:'호숫가 유물 발굴', className:'탐사 수업(제안)', stat:'탐험', space:'lakeside', description:'조각을 배치해 땅을 열고 유물을 발굴한다.', cognition:'배치 · 위험 관리', expectedDuration:'1~2분', scene:ExcavationScene },
  { id:'rune-link', title:'기억의 서고', className:'고대학 수업(제안)', stat:'지식', space:'library', description:'가려진 책과 잠긴 책장을 연결해 해제한다.', cognition:'기억 · 연결', expectedDuration:'1~3분', scene:RuneLinkScene },
  { id:'training-guardian', title:'훈련장 수호', className:'검술훈련', stat:'솜씨', space:'training', description:'이동·회피하며 다가오는 표적을 정화한다.', cognition:'회피 · 판단', expectedDuration:'약 1분', scene:TrainingGuardianScene },
  { id:'rune-merge', title:'온실 룬 연성', className:'고대학 수업(제안)', stat:'지식', space:'greenhouse', description:'씨앗 룬을 떨어뜨려 연쇄 성장시킨다.', cognition:'합성 · 공간 관리', expectedDuration:'1~2분', scene:RuneMergeScene },
  { id:'mirror-magic', title:'거울 마법', className:'마법훈련', stat:'마법', space:'observatory', description:'프리즘과 거울로 두 목표를 밝힌다.', cognition:'반사 · 경로 예측', expectedDuration:'1~3분', scene:MirrorMagicScene },
  { id:'seal-dismantle', title:'시계탑 봉인 해체', className:'탐사 수업(제안)', stat:'탐험', space:'plaza', description:'겹친 봉인핀을 순서대로 정리한다.', cognition:'순서 · 분류', expectedDuration:'1~2분', scene:SealDismantleScene },
];
