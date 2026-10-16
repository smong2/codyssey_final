import { registry } from '../minigames/index.js';
import { background, button, label, panel } from '../ui/theme.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('result'); }
  init(data) { this.result = data.result; this.startData = data.startData; }
  create() {
    const r = this.result;
    const meta = registry.find(game => game.id === r.gameId);
    this.spaceId=meta?.space||'plaza';background(this,this.spaceId);
    panel(this, 320, 125, 640, 460);
    label(this, r.outcome === 'success' ? '도전 성공!' : r.outcome === 'failure' ? '다시 도전해 볼까요?' : '도전 종료', 640, 162, 39, { fontStyle: 'bold' }).setOrigin(0.5, 0);
    label(this, meta?.title || r.gameId, 640, 224, 25).setOrigin(0.5, 0);
    label(this, `점수  ${r.score}`, 640, 288, 35, { fontStyle: 'bold' }).setOrigin(0.5, 0);
    label(this, `플레이 시간  ${(r.durationMs / 1000).toFixed(1)}초`, 640, 345, 21).setOrigin(0.5, 0);
    const names={ turns:'회전',roundsCleared:'완료 라운드',lines:'발굴선',placements:'배치',drops:'투하',merges:'합성',highest:'최고 성장',targetsCleared:'처리한 표적',survivedSeconds:'훈련 시간',focus:'집중',bestCombo:'최고 연속',pairsMatched:'연결한 쌍',mistakes:'실수',shuffles:'재배열',moves:'이동',stagesCleared:'완료 단계',rotations:'거울 회전',retries:'재시도' };
    const detail = Object.entries(r.metrics).slice(0, 3).map(([key, value]) => `${names[key] || key} ${value}`).join('   ·   ');
    label(this, detail, 640, 392, 17, { wordWrap: { width: 530 }, align: 'center' }).setOrigin(0.5, 0);
    button(this, '다시 하기', 435, 488, 180, 52, () => this.scene.start(r.gameId, this.startData), 'gold');
    button(this, '게임 목록', 665, 488, 180, 52, () => this.scene.start('menu'));
  }
}
