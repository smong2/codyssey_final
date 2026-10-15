import {canWalk,moveFoot} from '../core/collision.mjs';
// Development/playtest settings, not final movement or camera balance.
export const ADVENTURE_VIEW={spawn:{x:1920,y:2000},speed:360,displaySize:256,footY:218/256,zoom:0.7};
// User-approved temporary mode; per-object sort-line/zone data remains pending.
export const FOREGROUND_MODE='always-foreground';
export function mountAdventure(host,report){
 class AdventureScene extends Phaser.Scene{
  constructor(){super('adventure');this.debug=false;this.pad={x:0,y:0};}
  preload(){
   this.load.image('world','./design-assets/map/map01_greenhouse_world_3840x2160.webp');
   this.load.image('mask','./design-assets/map/map01_greenhouse_collision_mask_1920x1080.png');
   this.load.image('foreground','./design-assets/map/map01_greenhouse_foreground_3840x2160.webp');
   for(const d of ['S','SW','W','NW','N','NE','E','SE'])this.load.spritesheet('walk-'+d,'./sd-assets/SD03_'+d+'_strip.png',{frameWidth:256,frameHeight:256});
  }
  create(){
   if(!this.textures.exists('world')||!this.textures.exists('mask')||!this.textures.exists('foreground')||['S','SW','W','NW','N','NE','E','SE'].some(d=>!this.textures.exists('walk-'+d))){report('모험 자원을 불러오지 못했습니다. 날짜는 유지됩니다.');return;}
   const world=this.textures.get('world').getSourceImage(),source=this.textures.get('mask').getSourceImage();
   const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
   const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0);
   this.mask={width:source.width,height:source.height,pixels:context.getImageData(0,0,source.width,source.height).data,worldWidth:world.width,worldHeight:world.height};
   this.add.image(0,0,'world').setOrigin(0);
   this.foreground=this.add.image(0,0,'foreground').setOrigin(0).setDisplaySize(world.width,world.height).setDepth(15);
   this.overlay=this.add.image(0,0,'mask').setOrigin(0).setDisplaySize(world.width,world.height).setAlpha(0.4).setDepth(20).setVisible(false);
   if(!canWalk(this.mask,ADVENTURE_VIEW.spawn.x,ADVENTURE_VIEW.spawn.y)){report('시작 위치가 마스크의 흰색 영역이 아닙니다. 이동을 중단했습니다.');return;}
   // Layered low-opacity ellipses soften the contact edge without shadowing the sprite.
   this.footShadow=this.add.container(ADVENTURE_VIEW.spawn.x,ADVENTURE_VIEW.spawn.y+2).setDepth(9);
   for(const [width,height,alpha] of [[46,14,0.035],[38,11,0.05],[28,8,0.08]])this.footShadow.add(this.add.ellipse(0,0,width*2,height*2,0x40372e,alpha));
   this.player=this.add.sprite(ADVENTURE_VIEW.spawn.x,ADVENTURE_VIEW.spawn.y,'walk-S').setOrigin(0.5,ADVENTURE_VIEW.footY).setDisplaySize(ADVENTURE_VIEW.displaySize,ADVENTURE_VIEW.displaySize).setDepth(10);
   for(const d of ['S','SW','W','NW','N','NE','E','SE'])this.anims.create({key:'walking-'+d,frames:[0,1,2,1].map(frame=>({key:'walk-'+d,frame})),frameRate:7,repeat:-1});
   this.keys=this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
   this.input.keyboard.addCapture(['W','A','S','D','UP','DOWN','LEFT','RIGHT']);
   this.input.on('pointerdown',p=>{this.target={x:p.worldX,y:p.worldY};});
   const camera=this.cameras.main;
   const resize=()=>{camera.setZoom(Math.max(ADVENTURE_VIEW.zoom,this.scale.width/world.width,this.scale.height/world.height));camera.setBounds(0,0,world.width,world.height);};
   resize();camera.startFollow(this.player,true,1,1);this.scale.on('resize',resize);
   this.events.once('shutdown',()=>this.scale.off('resize',resize));
   this.lines=this.add.graphics().setDepth(30);
   this.coords=this.add.text(12,68,'',{fontFamily:'Gowun Batang',fontSize:'14px',color:'#ffffff',backgroundColor:'#000000cc',padding:{x:6,y:4}}).setScrollFactor(0).setDepth(40);
   report('이동 준비 완료 · 방향키/WASD 또는 화면 터치 · 조사·보상 없음',true);
  }
  update(_,delta){
   if(!this.player)return;
   const k=this.keys;let dx=(k.D.isDown||k.RIGHT.isDown?1:0)-(k.A.isDown||k.LEFT.isDown?1:0),dy=(k.S.isDown||k.DOWN.isDown?1:0)-(k.W.isDown||k.UP.isDown?1:0);
   if(dx||dy){this.target=null;}else if(this.pad.x||this.pad.y){dx=this.pad.x;dy=this.pad.y;this.target=null;}
   else if(this.target){dx=this.target.x-this.player.x;dy=this.target.y-this.player.y;if(Math.hypot(dx,dy)<3){dx=dy=0;this.target=null;}}
   const length=Math.hypot(dx,dy),before={x:this.player.x,y:this.player.y};
   if(length){
    const distance=Math.min(ADVENTURE_VIEW.speed*Math.min(delta,50)/1000,this.target?length:Infinity);
    const next=moveFoot(this.mask,before,dx/length*distance,dy/length*distance);this.player.setPosition(next.x,next.y);
    const direction=['E','SE','S','SW','W','NW','N','NE'][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
    if(next.x!==before.x||next.y!==before.y)this.player.play('walking-'+direction,true);
    else{this.player.anims.stop();this.player.setFrame(0);this.target=null;}
   }else{this.player.anims.stop();this.player.setFrame(0);}
   this.footShadow.setPosition(this.player.x,this.player.y+2);
   this.overlay.setVisible(this.debug);this.lines.clear();this.coords.setVisible(this.debug);
   if(this.debug){this.lines.lineStyle(2,0xffcc44).strokeRect(0,0,this.mask.worldWidth,this.mask.worldHeight);this.lines.fillStyle(0xff5555).fillCircle(this.player.x,this.player.y,4);
    const v=this.cameras.main.worldView;this.lines.lineStyle(2,0x00ffff).strokeRect(v.x,v.y,v.width,v.height);
    this.coords.setText('발 X '+this.player.x.toFixed(1)+' / Y '+this.player.y.toFixed(1)+' · 흰색만 이동 · 전경 임시 항상 앞');}
  }
 }
 const game=new Phaser.Game({type:Phaser.AUTO,parent:host,width:host.clientWidth,height:host.clientHeight,backgroundColor:'#000000',scale:{mode:Phaser.Scale.RESIZE},scene:[AdventureScene]});
 return {debug(){const scene=game.scene.getScene('adventure');scene.debug=!scene.debug;return scene.debug;},direction(x,y){game.scene.getScene('adventure').pad={x,y};},destroy(){game.destroy(true);}};
}
