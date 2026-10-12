import { BaseMinigameScene } from '../shared/BaseMinigameScene.js';
import { RULES, targetAt, acceptResponse } from './logic.js';
import { background, button, C, label, panel } from '../../ui/theme.js';

const colors = { blue: 0x4d94ba, gold: 0xd2a044, red: 0xb7594d };
export class TargetTrainingScene extends BaseMinigameScene {
  constructor() { super('target-training'); }
  create() {
    this.createShell('표적 훈련', '규칙을 읽고 베기·막기·지나치기 중 하나를 선택하세요. S / D / 스페이스도 사용 가능합니다.');
    this.wave = 0; this.index = 0; this.state = { responded: false, correct: 0, mistakes: 0, judged: 0 };
    panel(this, 320, 143, 640, 350);
    this.targetLayer = this.add.container();
    this.ruleText = label(this, '', 640, 166, 21, { align: 'center', wordWrap: { width: 590 }, fontStyle: 'bold' }).setOrigin(0.5,0);
    this.feedback = label(this, '', 640, 445, 22, { fontStyle: 'bold' }).setOrigin(0.5);
    button(this, '베기  S', 332, 522, 190, 62, () => this.respond('slash'), 'gold');
    button(this, '막기  D', 545, 522, 190, 62, () => this.respond('block'));
    button(this, '지나치기  Space', 758, 522, 190, 62, () => this.respond('none'), 'quiet');
    this.input.keyboard?.on('keydown-S', () => this.respond('slash'));
    this.input.keyboard?.on('keydown-D', () => this.respond('block'));
    this.input.keyboard?.on('keydown-SPACE', () => this.respond('none'));
    this.beginWave();
  }
  beginWave() {
    this.responseTimer?.remove(); this.nextTimer?.remove(); this.introTimer?.remove();
    this.target = null; this.state.responded = true;
    if (this.wave === 3) {
      this.score = this.state.correct * 45 - this.state.mistakes * 8;
      this.finish('success', { correct: this.state.correct, mistakes: this.state.mistakes, judged: this.state.judged });
      return;
    }
    this.ruleText.setText(`WAVE ${this.wave + 1} / 3\n${RULES[this.wave].title}`);
    this.setObjective(`WAVE ${this.wave + 1}/3 · 정답 ${this.state.correct} · 실수 ${this.state.mistakes}`);
    this.targetLayer.removeAll(true);
    this.feedback.setText('새로운 규칙을 확인하세요');
    const wave = this.wave;
    this.waveTimer = this.time.delayedCall(27000, () => { this.wave++; this.index = 0; this.beginWave(); });
    this.introTimer = this.time.delayedCall(2300, () => { if (wave === this.wave) this.spawnTarget(); });
  }
  spawnTarget() {
    if (this.done || this.wave >= 3) return;
    this.state.responded = false;
    this.target = targetAt(this.startData.seed, this.wave, this.index++);
    this.targetLayer.removeAll(true);
    const g = this.add.graphics();
    g.fillStyle(colors[this.target.color]);
    if (this.target.shape === 'circle') g.fillCircle(640, 338, 85);
    else g.fillTriangle(640, 245, 543, 410, 737, 410);
    g.lineStyle(6, C.cream).strokeCircle(640, 338, 108);
    this.targetLayer.add(g);
    this.targetLayer.add(label(this, `${{blue:'푸름',gold:'황금',red:'붉음'}[this.target.color]} · ${this.target.shape === 'circle' ? '원' : '삼각형'}`, 640, 415, 18).setOrigin(0.5));
    this.feedback.setText('어떻게 반응할까요?');
    this.responseTimer = this.time.delayedCall(1850, () => this.respond('none'));
  }
  respond(action) {
    if (!this.target || this.state.responded || this.done) return;
    this.responseTimer?.remove();
    const before = this.state.correct;
    this.state = acceptResponse(this.state, this.wave, this.target, action);
    const correct = this.state.correct > before;
    this.score = this.state.correct * 45 - this.state.mistakes * 8;
    this.feedback.setText(correct ? '정확해요!' : `다음에는 ${ {slash:'베기',block:'막기',none:'지나치기'}[RULES[this.wave].decide(this.target)] }`);
    this.setObjective(`WAVE ${this.wave + 1}/3 · 정답 ${this.state.correct} · 실수 ${this.state.mistakes}`);
    const wave = this.wave;
    this.nextTimer = this.time.delayedCall(450, () => { if (wave === this.wave) this.spawnTarget(); });
  }
}
