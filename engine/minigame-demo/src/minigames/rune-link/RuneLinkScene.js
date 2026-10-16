import { BaseMinigameScene } from '../shared/BaseMinigameScene.js';
import { makeChapter, canLink, findMove, reshuffleRemaining, WIDTH } from './logic.js';
import { cell, C, label, panel } from '../../ui/theme.js';

const symbols=['☼','✦','◆','✧','✚','◈','✿','✪','◉','✥','◇','⬟'];
const pairs=[8,10,12];
export class RuneLinkScene extends BaseMinigameScene {
  constructor() { super('rune-link'); }
  create() {
    this.createShell('기억의 서고', '같은 문양 두 권을 최대 두 번 꺾이는 길로 연결하세요. 책장이 열릴수록 새 규칙이 등장합니다.', 'library');
    this.chapter=0;this.totalMatched=0;this.mistakes=0;this.shuffles=0;this.combo=0;this.lastMatch=0;
    this.boardLayer=this.add.container();this.loadChapter();
  }
  loadChapter() {
    this.board=makeChapter(this.startData.seed,this.chapter);this.selected=null;this.chapterMatched=0;
    this.revealed=new Set();this.keyFound=false;this.transitioning=false;
    this.locked=new Set(this.chapter===2?[19,20,27,28]:[]);
    this.drawBoard();
    if(this.chapter>0)this.announce(this.chapter===1?'새 요소: 표지를 열어 책의 문양을 기억하세요':'새 요소: 열쇠 책으로 잠긴 책장을 여세요');
  }
  drawBoard() {
    this.boardLayer.removeAll(true);
    const minX=this.chapter===0?2:1,maxX=this.chapter===0?5:this.chapter===1?5:6;
    const step=[88,80,74][this.chapter],columns=maxX-minX+1,left=Math.round((this.scale.width-columns*step)/2),top=180;
    this.boardLayer.add(panel(this,left-17,top-17,columns*step+34,4*step+34));
    this.setObjective(`책장 ${this.chapter+1}/3 · ${this.chapter===0?'연결 연습':this.chapter===1?'새 요소: 표지를 열어 문양 기억':'새 요소: 열쇠 책으로 잠금 해제'} · ${this.chapterMatched}/${pairs[this.chapter]}쌍 · 연속 ${this.combo}`);
    this.board.forEach((value,i)=>{
      if(!value)return;
      const x=i%WIDTH,y=Math.floor(i/WIDTH),px=left+(x-minX)*step,py=top+(y-1)*step,locked=this.locked.has(i)&&!this.keyFound;
      const visible=this.chapter!==1||this.revealed.has(i);
      this.boardLayer.add(cell(this,px,py,step,locked?0x988d8b:this.selected===i?0xd2e6d1:visible?C.cream:0xcbbba4,locked?0x665d62:C.gold));
      const n=value==='K'?3:value.charCodeAt(0)-65;
      this.boardLayer.add(label(this,locked?'⌑':visible?value==='K'?'⚿':symbols[n]:'?',px+step/2-2,py+step/2-2,33,{color:locked?'#eee3d5':n%2?'#8a633b':'#476d78'}).setOrigin(0.5));
      const hit=this.add.zone(px,py,step-4,step-4).setOrigin(0).setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>this.select(i));this.boardLayer.add(hit);
    });
    this.boardLayer.add(panel(this,1009,164,183,194,0.95));
    this.boardLayer.add(label(this,'서고 기록',1029,181,21,{fontStyle:'bold'}));
    this.boardLayer.add(label(this,`연결 ${this.totalMatched}/30\n실수 ${this.mistakes}\n재배열 ${this.shuffles}`,1029,222,17,{lineSpacing:11}));
  }
  select(i) {
    if(this.done||this.transitioning||this.locked.has(i)&&!this.keyFound)return;
    this.revealed.add(i);
    if(this.selected===null||this.selected===i){this.selected=this.selected===i?null:i;this.drawBoard();return;}
    if(canLink(this.board,this.selected,i)){
      const key=this.board[i]==='K';this.board[this.selected]=null;this.board[i]=null;
      if(key)this.keyFound=true;
      this.chapterMatched++;this.totalMatched++;
      const now=performance.now();this.combo=now-this.lastMatch<3500?this.combo+1:1;this.lastMatch=now;
      this.score+=45+Math.min(this.combo,6)*12;
      this.burst(640,360,0xe5b96e);
      this.selected=null;
      if(this.chapterMatched===pairs[this.chapter]){
        this.transitioning=true;
        this.time.delayedCall(600,()=>{
          if(this.chapter===2)this.finish('success',{pairsMatched:this.totalMatched,mistakes:this.mistakes,shuffles:this.shuffles,bestCombo:this.combo});
          else{this.chapter++;this.loadChapter();}
        });
      } else if(!findMove(this.board)){
        this.shuffles++;this.board=reshuffleRemaining(this.board,this.startData.seed,this.shuffles);
      }
    }else{this.mistakes++;this.score=Math.max(0,this.score-5);this.combo=0;this.selected=i;}
    this.drawBoard();
  }
}
