import { BaseMinigameScene } from '../shared/BaseMinigameScene.js';
import { WIDTH, HEIGHT, nextRune, canDrop, drop } from './logic.js';
import { cell, label, panel } from '../../ui/theme.js';

const symbols=['','●','✿','❀','✦','✧','★','✺'];
const fills=[0,0x789b67,0x70b88b,0x91c4a1,0xd0ae70,0xe7c878,0xf1db9c,0xffe9bc];
export class RuneMergeScene extends BaseMinigameScene {
  constructor() { super('rune-merge'); }
  create() {
    this.createShell('온실 룬 연성', '열을 눌러 씨앗 룬을 떨어뜨리세요. 같은 단계가 닿으면 자라며 연쇄 합성됩니다.', 'greenhouse');
    this.board=Array(WIDTH*HEIGHT).fill(0); this.turn=0; this.merges=0; this.best=0;
    this.current=nextRune(this.startData.seed,0); this.layer=this.add.container();
    this.input.keyboard?.on('keydown',event=>{
      const number=Number(event.key); if(number>=1&&number<=WIDTH) this.play(number-1);
    });
    this.drawBoard();
  }
  play(col) {
    if(this.done||!canDrop(this.board,col)) return;
    const outcome=drop(this.board,col,this.current); if(!outcome)return;
    this.board=outcome.board;this.turn++;this.merges+=outcome.merges;this.best=Math.max(this.best,outcome.highest);
    this.score+=18+outcome.merges*(55+this.best*15);
    if(outcome.merges)this.burst(535,540,0xcfffad);
    if(this.best>=6){this.finish('success',{drops:this.turn,merges:this.merges,highest:this.best});return;}
    if(outcome.danger||!Array.from({length:WIDTH},(_,i)=>canDrop(this.board,i)).some(Boolean)){
      this.finish('failure',{drops:this.turn,merges:this.merges,highest:this.best});return;
    }
    this.current=nextRune(this.startData.seed,this.turn);this.drawBoard();
    if(this.turn===8)this.announce('새 요소: 이슬 룬은 다른 씨앗과도 결합합니다');
    if(this.turn===17)this.announce('새 요소: 더 높은 단계의 씨앗이 섞입니다');
  }
  drawBoard() {
    this.layer.removeAll(true);
    const stage=this.turn<8?1:this.turn<17?2:3,step=58,left=333,top=145;
    this.setObjective(`성장 ${stage}/3 · 목표 별꽃 ★ · 연쇄 ${this.merges}회 · 숫자 1~7로도 열 선택`);
    this.layer.add(panel(this,left-14,top-13,WIDTH*step+28,HEIGHT*step+27,0.96));
    for(let y=0;y<HEIGHT;y++) for(let x=0;x<WIDTH;x++){
      const tier=this.board[y*WIDTH+x],px=left+x*step,py=top+y*step;
      this.layer.add(cell(this,px,py,step,tier?fills[Math.min(tier,7)]:y===0?0xf3d9cf:0xe4eddb,tier?0x598065:0xb6ccae));
      if(tier)this.layer.add(label(this,symbols[Math.min(tier,7)],px+step/2-2,py+step/2-2,34,{color:tier>3?'#6e5135':'#285945'}).setOrigin(0.5));
      const hit=this.add.zone(px,py,step-4,step-4).setOrigin(0).setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>this.play(x));this.layer.add(hit);
    }
    this.layer.add(panel(this,807,166,301,250,0.96));
    this.layer.add(label(this,'다음 씨앗',834,190,26,{fontStyle:'bold'}));
    this.layer.add(label(this,this.current===-1?'✧':symbols[this.current],950,235,72,{color:'#558967'}).setOrigin(0.5));
    this.layer.add(label(this,this.current===-1?'이슬 룬: 다른 단계와도 결합':'같은 문양끼리 닿으면 성장',835,293,17,{wordWrap:{width:255}}));
    this.layer.add(label(this,'붉은 위쪽 줄에 닿으면 종료됩니다.',835,350,16,{color:'#a1534d'}));
    this.layer.add(label(this,`최고 성장 단계 ${this.best} / 6`,816,438,20,{color:'#fff9e8'}));
  }
}
