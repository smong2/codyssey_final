import { BaseMinigameScene } from '../shared/BaseMinigameScene.js';
import { LEVELS, key, move, parseLevel, solved } from './logic.js';
import { button, cell, C, label, panel } from '../../ui/theme.js';

export class RuneBlockPushScene extends BaseMinigameScene {
  constructor() { super('rune-block-push'); }
  create() {
    this.createShell('룬 블록 밀기', '룬석을 모든 마법진으로 미세요. 당길 수는 없습니다. 방향키/WASD 또는 버튼을 사용하세요.');
    this.level = 0; this.totalMoves = 0; this.totalPushes = 0; this.history = []; this.transitioning = false;
    this.boardLayer = this.add.container();
    button(this, '되돌리기', 903, 180, 140, 47, () => this.undo(), 'gold');
    button(this, '스테이지 재시작', 903, 237, 188, 47, () => this.loadLevel(), 'quiet');
    const controls = [['↑',0,-1,989,382],['←',-1,0,914,439],['↓',0,1,989,439],['→',1,0,1064,439]];
    controls.forEach(([symbol,dx,dy,x,y]) => button(this, symbol,x,y,64,52,() => this.step(dx,dy)));
    this.input.keyboard?.on('keydown', event => {
      const direction = { ArrowUp:[0,-1], KeyW:[0,-1], ArrowDown:[0,1], KeyS:[0,1], ArrowLeft:[-1,0], KeyA:[-1,0], ArrowRight:[1,0], KeyD:[1,0] }[event.code];
      if (direction) { event.preventDefault(); this.step(...direction); }
      if (event.code === 'KeyZ') this.undo();
    });
    this.loadLevel();
  }
  loadLevel() { this.state = parseLevel(LEVELS[this.level]); this.history = []; this.transitioning = false; this.drawBoard(); }
  step(dx,dy) {
    if (this.transitioning || this.done) return;
    const next = move(this.state,dx,dy);
    if (next === this.state) return;
    this.history.push(this.state); this.state = next;
    this.drawBoard();
    if (solved(this.state)) {
      this.transitioning = true;
      this.totalMoves += this.state.moves; this.totalPushes += this.state.pushes;
      this.score += 300 + Math.max(0, 150 - this.state.moves * 4);
      this.time.delayedCall(700, () => {
        if (this.level === 2) this.finish('success', { moves: this.totalMoves, pushes: this.totalPushes, stagesCleared: 3 });
        else { this.level++; this.loadLevel(); }
      });
    }
  }
  undo() { if (this.transitioning || !this.history.length) return; this.state = this.history.pop(); this.drawBoard(); }
  drawBoard() {
    this.boardLayer.removeAll(true);
    this.setObjective(`${this.level+1}/3 스테이지 · 이동 ${this.state.moves} · 밀기 ${this.state.pushes} · Z로 되돌리기`);
    const step = 61, left = 344, top = 143;
    this.boardLayer.add(panel(this, left - 15, top - 15, this.state.width*step+30, this.state.height*step+30));
    for (let y=0; y<this.state.height; y++) for (let x=0; x<this.state.width; x++) {
      const k=key(x,y), px=left+x*step, py=top+y*step;
      this.boardLayer.add(cell(this,px,py,step,this.state.walls.has(k)?C.blue:C.cream,this.state.walls.has(k)?C.navy:C.gold));
      if (this.state.walls.has(k)) continue;
      if (this.state.goals.has(k)) this.boardLayer.add(label(this,'◎',px+step/2-2,py+step/2-2,39,{color:'#2d8e91'}).setOrigin(0.5));
      if (this.state.boxes.has(k)) {
        this.boardLayer.add(cell(this,px+8,py+8,step-16,C.gold,C.blue));
        this.boardLayer.add(label(this,'✦',px+step/2-2,py+step/2-2,28,{color:'#fff7e6'}).setOrigin(0.5));
      }
      if (this.state.player[0]===x && this.state.player[1]===y) this.boardLayer.add(label(this,'◆',px+step/2-2,py+step/2-2,38,{color:'#3d8d9b'}).setOrigin(0.5));
    }
  }
}
