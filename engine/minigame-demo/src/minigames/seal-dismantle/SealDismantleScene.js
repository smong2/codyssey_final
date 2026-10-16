import { BaseMinigameScene } from '../shared/BaseMinigameScene.js';
import { LEVELS, exposed, take } from './logic.js';
import { button, label, panel } from '../../ui/theme.js';

const COLORS={A:0xc97568,B:0x759bb6,C:0xc9aa66,D:0x8fa978,E:0xae85ae};
export class SealDismantleScene extends BaseMinigameScene {
  constructor(){super('seal-dismantle');}
  create(){
    this.createShell('시계탑 봉인 해체','겹친 봉인핀을 골라 보관칸에 넣으세요. 같은 색 셋이 모이면 해제됩니다.','plaza');
    this.level=0;this.moves=0;this.retries=0;this.layer=this.add.container();this.loadLevel();
    button(this,'한 수 되돌리기',868,495,201,43,()=>this.undo(),'quiet');
  }
  loadLevel(){
    this.config=LEVELS[this.level];this.state={removed:[],tray:[]};this.history=[];this.transitioning=false;this.drawBoard();
    if(this.level>0)this.announce(this.level===1?'새 요소: 보관칸이 줄어듭니다':'새 요소: 앞뒤 봉인이 교차합니다');
  }
  undo(){if(this.done||this.transitioning||!this.history.length)return;this.state=this.history.pop();this.drawBoard();}
  choose(id){
    if(this.done||this.transitioning)return;
    const next=take(this.config,this.state,id);if(!next)return;
    this.history.push(this.state);this.state=next;this.moves++;
    const cleared=next.tray.length<this.history.at(-1).tray.length;
    this.score+=cleared?75:12;
    if(cleared)this.burst(969,263,0xffd38c);
    this.drawBoard();
    if(next.won){
      this.transitioning=true;
      this.time.delayedCall(650,()=>{
        if(this.level===LEVELS.length-1)this.finish('success',{stagesCleared:3,moves:this.moves,retries:this.retries});
        else{this.level++;this.loadLevel();}
      });
    } else if(next.overflow){
      this.transitioning=true;this.retries++;
      this.time.delayedCall(750,()=>this.loadLevel());
    }
  }
  drawBoard(){
    this.layer.removeAll(true);
    const layer=this.level+1;
    this.setObjective(`봉인 ${layer}/3 · 해제 ${this.state.removed.length}/${this.config.nodes.length} · 보관 ${this.state.tray.length}/${this.config.capacity}${this.state.overflow?' · 넘침! 재도전':''}`);
    this.layer.add(panel(this,105,145,653,479,0.96));
    const gear=this.add.graphics();
    gear.lineStyle(8,0xb89b72,0.65).strokeCircle(430,382,221);
    gear.lineStyle(4,0x607a80,0.65).strokeCircle(430,382,163);
    gear.fillStyle(0x4f6877,0.85).fillCircle(430,382,78);
    this.layer.add(gear);this.layer.add(label(this,'✦',430,382,64,{color:'#f7e9cb'}).setOrigin(0.5));
    this.config.nodes.forEach(node=>{
      if(this.state.removed.includes(node.id))return;
      const available=exposed(node,this.state.removed),g=this.add.graphics();
      g.fillStyle(available?COLORS[node.color]:0x667078).fillCircle(node.x+105,node.y,26);
      g.lineStyle(3,available?0xffedc7:0x9fa6a4).strokeCircle(node.x+105,node.y,26);
      this.layer.add(g);
      this.layer.add(label(this,available?'✦':'⌁',node.x+105,node.y,23,{color:available?'#fff8e9':'#d6d2c5'}).setOrigin(0.5));
      const hit=this.add.zone(node.x+105,node.y,56,56).setInteractive({useHandCursor:available});
      hit.on('pointerdown',()=>this.choose(node.id));this.layer.add(hit);
    });
    this.layer.add(panel(this,807,157,322,307,0.97));
    this.layer.add(label(this,'봉인 보관칸',835,177,26,{fontStyle:'bold'}));
    for(let i=0;i<this.config.capacity;i++){
      const x=839+i*59,g=this.add.graphics();g.fillStyle(this.state.tray[i]?COLORS[this.state.tray[i]]:0xd8d1c4).fillRoundedRect(x,234,49,54,8);this.layer.add(g);
      if(this.state.tray[i])this.layer.add(label(this,'✦',x+24,261,28,{color:'#fff8e9'}).setOrigin(0.5));
    }
    this.layer.add(label(this,'같은 색 3개가 모이면 칸이 비워집니다.',837,313,17,{wordWrap:{width:269}}));
    this.layer.add(label(this,'어두운 핀은 앞의 봉인을 먼저 풀어야 합니다.',837,376,16,{wordWrap:{width:268}}));
  }
}
