import { BaseMinigameScene } from '../shared/BaseMinigameScene.js';
import { LEVELS, key, traceBeam } from './logic.js';
import { cell, C, label, panel } from '../../ui/theme.js';

export class MirrorMagicScene extends BaseMinigameScene {
  constructor() { super('mirror-magic'); }
  create() {
    this.createShell('거울 마법', '천문대 거울을 돌려 별빛을 목표에 보내세요. 마지막에는 프리즘이 빛을 둘로 나눕니다.', 'observatory');
    this.level = 0; this.rotations = 0; this.boardLayer = this.add.container(); this.loadLevel();
  }
  loadLevel() {
    this.config = LEVELS[this.level];
    this.orientations = this.config.mirrors.map(([, , orientation]) => orientation === '/' ? '\\' : '/');
    this.transitioning = false; this.drawBoard();
    if(this.level>0)this.announce(this.level===1?'새 요소: 장애물을 피해 빛을 꺾으세요':'새 요소: 프리즘 빛으로 두 목표를 밝히세요');
  }
  drawBoard() {
    this.boardLayer.removeAll(true);
    const { width,height,source,goal,rune,prism,secondaryGoal,mirrors,blocks } = this.config;
    const step=70,left=Math.round((this.scale.width-width*step)/2),top=149;
    this.boardLayer.add(panel(this,left-16,top-16,width*step+32,height*step+32));
    this.setObjective(`${this.level+1}/3 스테이지 · ${this.level===0?'빛의 방향':this.level===1?'새 요소: 장애물 회피':'새 요소: 프리즘으로 두 목표 밝히기'} · 회전 ${this.rotations}회`);
    const beam=traceBeam(this.config,this.orientations);
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
      const px=left+x*step,py=top+y*step,k=key(x,y);
      this.boardLayer.add(cell(this,px,py,step,blocks.some(([bx,by])=>bx===x&&by===y)?C.blue:C.cream));
      const mark=source[0]===x&&source[1]===y?'✦':goal[0]===x&&goal[1]===y?'◎':secondaryGoal?.[0]===x&&secondaryGoal?.[1]===y?'◎':prism?.[0]===x&&prism?.[1]===y?'✧':rune?.[0]===x&&rune?.[1]===y?'★':blocks.some(([bx,by])=>bx===x&&by===y)?'▩':'';
      if(mark) this.boardLayer.add(label(this,mark,px+step/2-2,py+step/2-2,33,{color:mark==='▩'?'#f8ecd1':'#2d8e91'}).setOrigin(0.5));
    }
    const ray=this.add.graphics();
    beam.paths.forEach((path,index)=>{
      ray.lineStyle(index?7:9,index?0xffd796:C.aqua,0.86).beginPath();
      path.forEach(([x,y],i)=>i?ray.lineTo(left+x*step+step/2-2,top+y*step+step/2-2):ray.moveTo(left+x*step+step/2-2,top+y*step+step/2-2));
      ray.strokePath();
    });this.boardLayer.add(ray);
    mirrors.forEach(([x,y],i)=>{
      const px=left+x*step,py=top+y*step;
      this.boardLayer.add(label(this,this.orientations[i],px+step/2-2,py+step/2-3,48,{color:'#a16a30',fontStyle:'bold'}).setOrigin(0.5));
      const hit=this.add.zone(px,py,step-4,step-4).setOrigin(0).setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>{
        if(this.transitioning)return;
        this.orientations[i]=this.orientations[i]==='/'?'\\':'/'; this.rotations++;
        this.drawBoard();
        if(traceBeam(this.config,this.orientations).success){
          this.transitioning=true; this.score+=300+Math.max(0,100-this.rotations*3);
          this.burst(left+goal[0]*step+step/2,top+goal[1]*step+step/2,0xa9eaff);
          this.time.delayedCall(650,()=>this.level===2?this.finish('success',{rotations:this.rotations,stagesCleared:3}):(this.level++,this.loadLevel()));
        }
      }); this.boardLayer.add(hit);
    });
    const status=beam.success?'모든 목표에 빛이 닿았습니다!':beam.outcome==='loop'?'빛이 순환합니다':beam.outcome==='block'?'장애물에 막혔습니다':beam.outcome==='goal'?'다른 목표에도 빛을 보내세요':'빛의 경로를 살펴보세요';
    this.boardLayer.add(panel(this,left,top+height*step+5,width*step,42,0.95));
    this.boardLayer.add(label(this,status,left+14,top+height*step+14,18));
  }
}
