import { BaseMinigameScene } from '../shared/BaseMinigameScene.js';
import { LEVELS, locate, key, addStep, evaluate, tileColor } from './logic.js';
import { button, cell, C, label, panel } from '../../ui/theme.js';

export class RulePathScene extends BaseMinigameScene {
  constructor() { super('rule-path'); }
  create() {
    this.createShell('조건형 길 찾기', '인접한 칸을 클릭해 계획 경로를 만들고 실행하세요. 실패하면 되돌려 수정할 수 있습니다.');
    this.level=0; this.attempts=0; this.boardLayer=this.add.container();
    button(this,'한 칸 되돌리기',909,210,176,48,()=>{if(this.path.length>1){this.path.pop();this.drawBoard();}},'quiet');
    button(this,'경로 지우기',909,269,176,48,()=>{this.path=[locate(this.config,'S')];this.drawBoard();},'quiet');
    button(this,'계획 실행',909,338,176,60,()=>this.execute(),'gold');
    this.feedback=label(this,'',905,435,20,{color:'#fff8df',wordWrap:{width:260}});
    this.loadLevel();
  }
  loadLevel() {
    this.config=LEVELS[this.level]; this.path=[locate(this.config,'S')]; this.transitioning=false;
    this.feedback.setText('경로를 먼저 선택하세요.'); this.drawBoard();
  }
  drawBoard() {
    this.boardLayer.removeAll(true);
    const rows=this.config.rows,w=rows[0].length,h=rows.length,step=Math.min(72,Math.floor(470/Math.max(w,h))),left=Math.round(590-w*step/2),top=157;
    this.boardLayer.add(panel(this,left-16,top-16,w*step+32,h*step+32));
    this.setObjective(`${this.level+1}/3 스테이지 · 경로 ${this.path.length-1}칸${this.config.energy<Infinity?` / 마력 ${this.config.energy}`:''} · 열쇠→문${this.config.rune?'→별 룬':''}`);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
      const symbol=rows[y][x],px=left+x*step,py=top+y*step,planned=this.path.some(p=>p[0]===x&&p[1]===y);
      const fill=symbol==='#'?C.blue:planned?0xc4e9db:tileColor(this.config,[x,y])==='blue'?0xe1eced:C.cream;
      this.boardLayer.add(cell(this,px,py,step,fill));
      const mark={S:'출발',G:'◎',K:'⚿',D:'▣'}[symbol]||(this.config.rune?.[0]===x&&this.config.rune?.[1]===y?'★':'');
      if(mark) this.boardLayer.add(label(this,mark,px+step/2-2,py+step/2-2,mark==='출발'?17:32,{color:symbol==='D'?'#a16c31':'#2d8e91',fontStyle:'bold'}).setOrigin(0.5));
      if(symbol!=='#') {
        const hit=this.add.zone(px,py,step-4,step-4).setOrigin(0).setInteractive({useHandCursor:true});
        hit.on('pointerdown',()=>{
          if(this.transitioning)return;
          const next=addStep(this.config,this.path,[x,y]);
          if(next===this.path) {this.feedback.setText('마지막 칸에 인접한 통로를 선택하세요.');return;}
          this.path=next;this.feedback.setText('계획을 이어가거나 실행하세요.');this.drawBoard();
        }); this.boardLayer.add(hit);
      }
    }
    const route=this.add.graphics(); route.lineStyle(7,C.teal,0.8).beginPath();
    this.path.forEach(([x,y],i)=>i?route.lineTo(left+x*step+step/2-2,top+y*step+step/2-2):route.moveTo(left+x*step+step/2-2,top+y*step+step/2-2));
    route.strokePath();this.boardLayer.add(route);
    this.path.forEach(([x,y],i)=>this.boardLayer.add(label(this,String(i),left+x*step+step/2-2,top+y*step+step/2-2,19,{color:'#17384a',fontStyle:'bold'}).setOrigin(0.5)));
  }
  execute() {
    if(this.transitioning||this.done)return;
    this.attempts++;
    const verdict=evaluate(this.config,this.path);
    if(!verdict.ok){this.feedback.setText(verdict.reason);return;}
    this.transitioning=true;this.feedback.setText('조건을 모두 지켰습니다!');
    this.score+=350+Math.max(0,90-this.path.length*5);
    this.time.delayedCall(700,()=>this.level===2?this.finish('success',{attempts:this.attempts,stagesCleared:3}):(this.level++,this.loadLevel()));
  }
}
