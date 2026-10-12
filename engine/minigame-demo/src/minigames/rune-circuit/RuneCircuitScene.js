import { BaseMinigameScene } from '../shared/BaseMinigameScene.js';
import { buildBoard, connections, DIRS, rotate } from './logic.js';
import { cell, C, label, panel } from '../../ui/theme.js';

export class RuneCircuitScene extends BaseMinigameScene {
  constructor() { super('rune-circuit'); }
  create() {
    this.createShell('룬 회로', '공방의 회로를 돌려 마력을 보내세요. 밝게 빛나는 회로는 이미 연결된 구간입니다.', 'workshop');
    this.level = 0; this.turns = 0; this.transitioning = false;
    this.boardLayer = this.add.container();
    this.loadLevel();
  }
  loadLevel() {
    this.board = buildBoard(this.level, this.startData.seed);
    this.setObjective(`${this.level + 1}/3 회로 · ${this.level===0?'기본 연결':this.level===1?'새 요소: 고정 회로':'새 요소: 두 마법진으로 분기'} · 회전 ${this.turns}회`);
    this.drawBoard();
    if(this.level>0)this.announce(this.level===1?'새 요소: 회색 회로는 고정되어 있습니다':'새 요소: 두 마법진 모두 밝혀야 합니다');
  }
  drawBoard() {
    this.boardLayer.removeAll(true);
    const { size, tiles, start, goal, mandatory, branchGoal, fixed } = this.board;
    const width = Math.min(500, this.scale.height - 195), step = Math.floor(width / size);
    const left = Math.round((this.scale.width - size * step) / 2), top = 139;
    const active = connections(this.board).reached;
    this.boardLayer.add(panel(this, left - 18, top - 18, size * step + 36, size * step + 36));
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x, px = left + x * step, py = top + y * step;
      const isStart = x === start[0] && y === start[1], isGoal = x === goal[0] && y === goal[1];
      const isStar = mandatory && x === mandatory[0] && y === mandatory[1];
      const isBranchGoal = branchGoal && x === branchGoal[0] && y === branchGoal[1];
      const isFixed = fixed.some(([fx,fy])=>fx===x&&fy===y);
      this.boardLayer.add(cell(this, px, py, step, isFixed?0xd6c7b2:active.has(i)?0xffe6bc:C.cream, isStart || isGoal || isBranchGoal ? C.teal : C.gold));
      const g = this.add.graphics();
      g.lineStyle(Math.max(7, step / 10), active.has(i) ? C.teal : C.blue, 1);
      for (const [dx,dy,bit] of DIRS) if (tiles[i] & bit) {
        g.beginPath(); g.moveTo(px + step/2, py + step/2);
        g.lineTo(px + step/2 + dx * step * 0.43, py + step/2 + dy * step * 0.43); g.strokePath();
      }
      g.fillStyle(active.has(i) ? C.aqua : C.gold).fillCircle(px + step/2, py + step/2, 8);
      this.boardLayer.add(g);
      if (isStart || isGoal || isStar || isBranchGoal || isFixed) this.boardLayer.add(label(this, isStart ? '시작' : isGoal || isBranchGoal ? '도착' : isFixed?'고정':'★', px + step/2, py + step - 27, 15, { fontStyle: 'bold' }).setOrigin(0.5));
      if (!isStart && !isGoal && !isBranchGoal && !isFixed) {
        const hit = this.add.zone(px, py, step - 4, step - 4).setOrigin(0).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          if (this.transitioning) return;
          const before=connections(this.board).reached.size;
          tiles[i] = rotate(tiles[i]); this.turns++; const gained=Math.max(0,connections(this.board).reached.size-before);this.score+=gained*5; this.drawBoard();
          if(gained)this.burst(px+step/2,py+step/2,0xffd483);
          if (connections(this.board).won) {
            this.transitioning = true;
            this.score += 300 + Math.max(0, 100 - this.turns * 3);
            this.time.delayedCall(500, () => {
              if (this.level === 2) this.finish('success', { turns: this.turns, roundsCleared: 3 });
              else { this.level++; this.transitioning = false; this.loadLevel(); }
            });
          }
        });
        this.boardLayer.add(hit);
      }
    }
    this.boardLayer.add(panel(this,left+size*step+24,top,193,126,0.94));
    this.boardLayer.add(label(this,`마력 도달 ${active.size}칸`,left+size*step+40,top+18,19));
    this.boardLayer.add(label(this,this.level===2?'두 도착점 모두 켜세요.':this.level===1?'고정 회로는 돌릴 수 없어요.':'빛나는 길을 확장하세요.',left+size*step+40,top+58,16,{wordWrap:{width:158}}));
  }
}
