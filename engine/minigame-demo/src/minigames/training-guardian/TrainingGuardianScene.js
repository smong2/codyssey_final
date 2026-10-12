import { BaseMinigameScene } from '../shared/BaseMinigameScene.js';
import { makeRng } from '../shared/rng.js';
import { label, panel } from '../../ui/theme.js';

const ARENA={left:175,right:1105,top:139,bottom:617};
const ENEMY={spark:{color:0x7ca7bd,speed:73,hp:1,r:15},charger:{color:0xda9571,speed:92,hp:2,r:18},caster:{color:0x9c85bd,speed:44,hp:2,r:19}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class TrainingGuardianScene extends BaseMinigameScene {
  constructor(){super('training-guardian');}
  create(){
    this.createShell('훈련장 수호','터치/마우스 또는 WASD로 이동하세요. 가까운 훈련 표적에는 자동으로 룬이 발사됩니다.','training');
    panel(this,ARENA.left-14,ARENA.top-13,ARENA.right-ARENA.left+28,ARENA.bottom-ARENA.top+26,0.75);
    this.random=makeRng(`${this.startData.seed}:guardian`);
    this.player={x:640,y:390,r:18,focus:6,invulnerable:0,target:null};
    this.enemies=[];this.bolts=[];this.elapsed=0;this.attackCooldown=0;this.spawnCooldown=0;this.kills=0;this.wave=0;
    this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    this.gfx=this.add.graphics();
    this.hud=label(this,'',190,151,21,{fontStyle:'bold',color:'#fff9e9',backgroundColor:'#283b48',padding:{x:10,y:6}});
    this.prompt=label(this,'',640,625,18,{color:'#fff9e9',fontStyle:'bold'}).setOrigin(0.5);
    this.input.on('pointerdown',this.setTarget,this);this.input.on('pointermove',this.dragTarget,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.input.off('pointerdown',this.setTarget,this);this.input.off('pointermove',this.dragTarget,this);});
  }
  setTarget(pointer){if(pointer.y>=ARENA.top&&pointer.y<=ARENA.bottom)this.player.target={x:pointer.x,y:pointer.y};}
  dragTarget(pointer){if(pointer.isDown)this.setTarget(pointer);}
  spawn(){
    const edge=Math.floor(this.random()*4),offset=this.random();
    const x=edge<2?edge===0?ARENA.left:ARENA.right:ARENA.left+offset*(ARENA.right-ARENA.left);
    const y=edge>=2?edge===2?ARENA.top:ARENA.bottom:ARENA.top+offset*(ARENA.bottom-ARENA.top);
    const chance=this.random(),kind=this.wave===0?'spark':this.wave===1?(chance<0.32?'charger':'spark'):(chance<0.3?'caster':chance<0.63?'charger':'spark');
    this.enemies.push({x,y,kind,hp:ENEMY[kind].hp,charge:1.7+this.random()*1.2,shot:1.5+this.random()*1.5});
  }
  update(time,delta){
    super.update();if(this.done)return;
    const dt=Math.min(delta/1000,0.05);this.elapsed+=dt;
    const nextWave=Math.min(2,Math.floor(this.elapsed/20));
    if(nextWave!==this.wave){this.wave=nextWave;this.prompt.setText(this.wave===1?'새 요소: 돌진 표적이 붉게 예고됩니다.':'새 요소: 보라 표적이 투사체를 발사합니다.');this.announce(this.prompt.text);this.time.delayedCall(3500,()=>this.prompt?.setText(''));}
    if(this.elapsed>=60){this.finish('success',{survivedSeconds:60,targetsCleared:this.kills,focus:this.player.focus});return;}
    this.movePlayer(dt);this.attackCooldown-=dt;this.spawnCooldown-=dt;this.player.invulnerable=Math.max(0,this.player.invulnerable-dt);
    if(this.spawnCooldown<=0&&this.enemies.length<30){this.spawn();this.spawnCooldown=Math.max(0.38,1.05-this.wave*0.2-this.elapsed*0.003);}
    if(this.attackCooldown<=0){this.autoAttack();this.attackCooldown=Math.max(0.25,0.48-this.wave*0.04);}
    this.updateEnemies(dt);this.updateBolts(dt);this.draw();
    this.hud.setText(`WAVE ${this.wave+1}/3     집중 ${'◆'.repeat(this.player.focus)}     훈련 ${Math.ceil(60-this.elapsed)}초     표적 ${this.kills}`);
    this.setObjective(`표적의 움직임을 보고 피하세요 · 현재 ${this.wave===0?'접근 표적':this.wave===1?'돌진 표적 추가':'원거리 표적 추가'}`);
  }
  movePlayer(dt){
    const p=this.player,k=this.keys;
    let dx=Number(k?.D?.isDown||k?.RIGHT?.isDown)-Number(k?.A?.isDown||k?.LEFT?.isDown);
    let dy=Number(k?.S?.isDown||k?.DOWN?.isDown)-Number(k?.W?.isDown||k?.UP?.isDown);
    if(dx||dy){p.target=null;const mag=Math.hypot(dx,dy);p.x+=dx/mag*245*dt;p.y+=dy/mag*245*dt;}
    else if(p.target){const vx=p.target.x-p.x,vy=p.target.y-p.y,mag=Math.hypot(vx,vy);if(mag>4){p.x+=vx/mag*Math.min(mag,245*dt);p.y+=vy/mag*Math.min(mag,245*dt);}}
    p.x=clamp(p.x,ARENA.left+25,ARENA.right-25);p.y=clamp(p.y,ARENA.top+25,ARENA.bottom-25);
  }
  autoAttack(){
    const target=this.enemies.filter(e=>distance(e,this.player)<300).sort((a,b)=>distance(a,this.player)-distance(b,this.player))[0];
    if(!target)return;
    target.hp--;this.bolts.push({x:this.player.x,y:this.player.y,tx:target.x,ty:target.y,life:0.18,friendly:true});
    if(target.hp<=0){this.enemies.splice(this.enemies.indexOf(target),1);this.kills++;this.score+=30+this.wave*10;}
  }
  updateEnemies(dt){
    for(const enemy of this.enemies){
      const type=ENEMY[enemy.kind],vx=this.player.x-enemy.x,vy=this.player.y-enemy.y,mag=Math.max(1,Math.hypot(vx,vy));
      if(enemy.kind==='charger')enemy.charge-=dt;
      const rushing=enemy.kind==='charger'&&enemy.charge<0;
      if(enemy.kind!=='caster'||mag>175){const speed=type.speed*(rushing?3.2:1);enemy.x+=vx/mag*speed*dt;enemy.y+=vy/mag*speed*dt;}
      if(rushing&&enemy.charge<-0.42)enemy.charge=2.3;
      if(enemy.kind==='caster'){enemy.shot-=dt;if(enemy.shot<=0){this.bolts.push({x:enemy.x,y:enemy.y,vx:vx/mag*205,vy:vy/mag*205,life:3,friendly:false});enemy.shot=2.2;}}
      if(mag<type.r+this.player.r&&this.player.invulnerable<=0)this.hurt();
    }
  }
  updateBolts(dt){
    this.bolts=this.bolts.filter(b=>{b.life-=dt;if(!b.friendly){b.x+=b.vx*dt;b.y+=b.vy*dt;if(distance(b,this.player)<26&&this.player.invulnerable<=0){this.hurt();return false;}}return b.life>0;});
  }
  hurt(){
    if(this.done||this.player.invulnerable>0)return;
    this.player.focus--;this.player.invulnerable=1.1;this.cameras.main.shake(90,0.0025);
    if(this.player.focus<=0)this.finish('failure',{survivedSeconds:Math.round(this.elapsed),targetsCleared:this.kills,focus:0});
  }
  draw(){
    const g=this.gfx;g.clear();
    g.lineStyle(4,0xf6e6bf,0.75).strokeRoundedRect(ARENA.left,ARENA.top,ARENA.right-ARENA.left,ARENA.bottom-ARENA.top,14);
    for(const e of this.enemies){const data=ENEMY[e.kind];g.fillStyle(data.color).fillCircle(e.x,e.y,data.r);g.lineStyle(2,0xfff0d2).strokeCircle(e.x,e.y,data.r);
      if(e.kind==='charger'&&e.charge<0.45&&e.charge>=0){g.lineStyle(4,0xe26855,0.85).strokeCircle(e.x,e.y,data.r+13);}
      if(e.kind==='caster'){g.lineStyle(2,0xcac0ef,0.8).strokeCircle(e.x,e.y,data.r+6);}
    }
    for(const b of this.bolts){if(b.friendly){g.lineStyle(7,0xffe59d,b.life/0.18).lineBetween(b.x,b.y,b.tx,b.ty);}else g.fillStyle(0xd1a4ea).fillCircle(b.x,b.y,7);}
    g.fillStyle(this.player.invulnerable>0?0xffe4a4:0x9fe4d7,this.player.invulnerable>0?0.65:1).fillCircle(this.player.x,this.player.y,18);
    g.lineStyle(4,0xffffff).strokeCircle(this.player.x,this.player.y,18);
    g.fillStyle(0xffffff).fillCircle(this.player.x,this.player.y,5);
  }
}
