import { BaseMinigameScene } from '../shared/BaseMinigameScene.js';
import { chooseTreasure, investigate } from './logic.js';
import { cell, C, label, panel } from '../../ui/theme.js';

export class TreasureSearchScene extends BaseMinigameScene {
  constructor() { super('treasure-search'); }
  create() {
    this.createShell('숨겨진 보물', '7×7 칸을 조사하세요. 거리·방향·이전 조사와의 비교가 다음 위치를 알려줍니다.');
    this.round = 0; this.found = 0; this.digs = 0; this.transitioning = false;
    this.boardLayer = this.add.container(); this.loadRound();
  }
  loadRound() {
    this.state = { treasure: chooseTreasure(this.startData.seed, this.round), visited: [], remaining: 8, lastDistance: null, lastHint: null, found: false };
    this.drawBoard();
  }
  drawBoard() {
    this.boardLayer.removeAll(true);
    const size = 7, step = 66, left = Math.round((this.scale.width - size * step) / 2) - 85, top = 147;
    this.boardLayer.add(panel(this, left - 15, top - 15, size * step + 30, size * step + 30));
    this.setObjective(`${this.round + 1}/3 보물 · 남은 조사 ${this.state.remaining}회 · 찾은 보물 ${this.found}개`);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const key = `${x},${y}`, visited = this.state.visited.includes(key);
      const px = left + x * step, py = top + y * step;
      this.boardLayer.add(cell(this, px, py, step, visited ? 0xd5e9e7 : C.cream));
      this.boardLayer.add(label(this, visited ? (x === this.state.treasure[0] && y === this.state.treasure[1] ? '✦' : '·') : '✧', px + step/2 - 2, py + step/2 - 2, 30, { color: visited ? '#2d8e91' : '#9e7942' }).setOrigin(0.5));
      if (!visited) {
        const hit = this.add.zone(px, py, step - 4, step - 4).setOrigin(0).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          if (this.transitioning) return;
          this.state = investigate(this.state, [x, y]); this.digs++;
          if (this.state.found) { this.found++; this.score += 270 + this.state.remaining * 25; }
          this.drawBoard();
          if (this.state.found || this.state.remaining === 0) { this.transitioning = true; this.time.delayedCall(1000, () => {
            if (this.round === 2) this.finish(this.found >= 2 ? 'success' : 'timeout', { treasuresFound: this.found, digs: this.digs });
            else { this.round++; this.transitioning = false; this.loadRound(); }
          }); }
        });
        this.boardLayer.add(hit);
      }
    }
    this.boardLayer.add(panel(this, left + size * step + 20, top + 25, 260, 205));
    this.boardLayer.add(label(this, '탐사 기록', left + size * step + 40, top + 43, 22, { fontStyle: 'bold' }));
    this.boardLayer.add(label(this, this.state.lastHint ? this.state.lastHint.text : '첫 칸을 조사해\n단서를 얻으세요.', left + size * step + 40, top + 93, 19, { wordWrap: { width: 225 }, lineSpacing: 12 }));
  }
}
