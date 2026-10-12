import { BaseMinigameScene } from '../shared/BaseMinigameScene.js';
import { SIZE, anyPlacement, place, nextChoices } from './logic.js';
import { button, cell, label, panel, SPACES } from '../../ui/theme.js';

export class ExcavationScene extends BaseMinigameScene {
  constructor() { super('excavation'); }
  create() {
    this.createShell('호숫가 유물 발굴', '조각을 선택해 놓으세요. 가로·세로를 채우면 땅이 열리고 유물이 드러납니다.', 'lakeside');
    this.board = Array(SIZE*SIZE).fill(0); this.cracks = {}; this.choices = [];
    this.lines = 0; this.placements = 0; this.draws = 0; this.chisel = 1; this.chiselMode = false; this.selected = 0;
    this.layer = this.add.container();
    this.chiselButton=button(this, '정리 도구 ×1', 875, 489, 210, 45, () => { if (this.chisel) { this.chiselMode = !this.chiselMode; this.drawBoard(); } }, 'gold');
    this.refill();
  }
  refill() {
    this.choices = nextChoices(this.startData.seed, this.draws++, Math.min(2,Math.floor(this.lines/2)), this.board);
    this.selected = this.choices.findIndex(shape => anyPlacement(this.board,shape));
    if (this.selected < 0) {
      if(this.chisel){this.chiselMode=true;this.announce('놓을 조각이 없습니다. 정리 도구로 한 칸을 비우세요.');this.drawBoard();return;}
      this.finish('failure', { lines: this.lines, placements: this.placements }); return;
    }
    this.drawBoard();
  }
  placeAt(x,y) {
    if (this.done) return;
    if (this.chiselMode) {
      const i=y*SIZE+x;
      if (this.board[i]) { this.board[i]=0; delete this.cracks[i]; this.chisel=0; this.chiselMode=false; this.chiselButton.t.setText('정리 도구 사용함');this.refill(); }
      return;
    }
    const shape=this.choices[this.selected]; if (!shape) return;
    const outcome=place(this.board,this.cracks,shape,x,y); if (!outcome) return;
    this.board=outcome.board; this.cracks=outcome.cracks; this.lines+=outcome.cleared; this.placements++;
    this.score+=shape.length*12+outcome.cleared*(90+Math.min(3,outcome.cleared)*30);
    if(outcome.cleared)this.burst(519,365,0x8be0cb);
    this.choices[this.selected]=null;
    // Each pair of completed lines reveals a tougher stratum with two-hit stone.
    for (const milestone of [2,4]) if (this.lines >= milestone && !this[`stratum${milestone}`]) {
      this[`stratum${milestone}`]=true;
      const positions = milestone===2 ? [10,45] : [19,36,52];
      positions.forEach(i => { if (!this.board[i]) { this.board[i]=1; this.cracks[i]=2; } });
      this.announce(milestone===2?'유물 발견! 새 지층: 두 번 발굴하는 돌':'두 번째 유물 발견! 돌이 더 늘어납니다');
    }
    if (this.lines >= 6) { this.finish('success', { lines:this.lines, placements:this.placements, strata:3 }); return; }
    if (!this.choices.some(shape => shape && anyPlacement(this.board,shape))) this.refill();
    else { this.selected=this.choices.findIndex(shape => shape && anyPlacement(this.board,shape)); this.drawBoard(); }
  }
  drawBoard() {
    this.layer.removeAll(true);
    const stage=Math.min(3,Math.floor(this.lines/2)+1), step=57, left=291, top=141;
    this.setObjective(`지층 ${stage}/3 · 발굴선 ${this.lines}/6 · 배치 ${this.placements}회${this.chiselMode?' · 정리할 칸을 선택하세요':''}`);
    this.layer.add(panel(this,left-13,top-13,SIZE*step+26,SIZE*step+26,0.96));
    for(let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) {
      const i=y*SIZE+x,px=left+x*step,py=top+y*step,rock=this.cracks[i];
      const fill=rock?0x9e8b7b:this.board[i]?0x6baea7:0xece7d6;
      this.layer.add(cell(this,px,py,step,fill,rock?0x675e62:0x83aaa1));
      if(rock) this.layer.add(label(this,rock===2?'◆':'◇',px+step/2-2,py+step/2-2,26,{color:'#fff7df'}).setOrigin(0.5));
      const hit=this.add.zone(px,py,step-4,step-4).setOrigin(0).setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>this.placeAt(x,y)); this.layer.add(hit);
    }
    this.layer.add(panel(this,814,141,310,321,0.96));
    this.layer.add(label(this,'발굴 도구',837,157,26,{fontStyle:'bold'}));
    this.layer.add(label(this,`유물  ${'◆'.repeat(Math.min(3,Math.floor(this.lines/2)))}${'◇'.repeat(3-Math.min(3,Math.floor(this.lines/2)))}`,837,190,18,{color:'#3f817c'}));
    this.layer.add(label(this,'조각을 고른 뒤 빈 칸을 누르세요.',837,212,15));
    this.choices.forEach((shape,index)=>{
      const y=226+index*71,selected=index===this.selected;
      const g=this.add.graphics();g.fillStyle(selected?SPACES.lakeside.accent:0xd9e9df).fillRoundedRect(836,y,264,58,10);
      this.layer.add(g);
      if(shape) shape.forEach(([dx,dy])=>this.layer.add(cell(this,863+dx*24,236+y-226+dy*24,24,0x427d86,0xe6f6e6)));
      this.layer.add(label(this,shape?'선택':'사용함',1050,y+17,15).setOrigin(0.5));
      const hit=this.add.zone(836,y,264,58).setOrigin(0).setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>{if(shape&&anyPlacement(this.board,shape)){this.selected=index;this.chiselMode=false;this.drawBoard();}});this.layer.add(hit);
    });
    this.layer.add(label(this,'두 번째 지층부터 돌은 두 번 발굴해야 합니다.',832,447,15,{wordWrap:{width:274}}));
  }
}
