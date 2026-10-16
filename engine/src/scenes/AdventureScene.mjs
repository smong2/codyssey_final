import {canWalk,moveFoot} from '../core/collision.mjs';
import {createPreviewObjectives,investigateObjective,reachableSafeCandidates,ADVENTURE_GEOMETRY} from '../core/adventure-mission.mjs';
import {SD_DIRECTIONS,sdCharacterStrip} from '../core/sd-characters.mjs';
import {ADVENTURE_NPC_ENCOUNTER_RADIUS,takeAdventureEncounter} from './adventure-encounters.mjs';

// Development/playtest settings, not final movement or camera balance.
export const ADVENTURE_VIEW={speed:360,displaySize:256,footY:218/256};
// User-approved temporary mode; per-object sort-line/zone data remains pending.
export const FOREGROUND_MODE='always-foreground';

export function mountAdventure(host,{startData,map,characterId='CH01',npcs=[],onEncounter=()=>{},onReady,onState,onFinish}){
 class AdventureScene extends Phaser.Scene{
  constructor(){super('adventure');this.debug=false;this.pad={x:0,y:0};this.active=false;this.paused=false;this.overlayPaused=false;this.investigating=false;this.remainingMs=0;this.lastPublishedSecond=null;this.investigationCount=0;this.foundIds=[];this.trackedId=null;this.destroyed=false;}
  preload(){
   this.load.image('world',map.world);
   this.load.image('mask',map.mask);
   this.load.image('foreground',map.foreground);
   for(const d of SD_DIRECTIONS)this.load.spritesheet('walk-'+d,sdCharacterStrip(characterId,d),{frameWidth:256,frameHeight:256});
  }
  create(){
   if(['world','mask','foreground',...SD_DIRECTIONS.map(d=>'walk-'+d)].some(key=>!this.textures.exists(key))){onState({error:'모험 자원을 불러오지 못했습니다. 날짜는 유지됩니다.'});return;}
   const world=this.textures.get('world').getSourceImage(),source=this.textures.get('mask').getSourceImage();
   const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
   const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0);
   this.mask={width:source.width,height:source.height,pixels:context.getImageData(0,0,source.width,source.height).data,worldWidth:world.width,worldHeight:world.height};
   this.add.image(0,0,'world').setOrigin(0);
   this.foreground=this.add.image(0,0,'foreground').setOrigin(0).setDisplaySize(world.width,world.height).setDepth(15);
   this.overlay=this.add.image(0,0,'mask').setOrigin(0).setDisplaySize(world.width,world.height).setAlpha(0.4).setDepth(20).setVisible(false);
   if(!canWalk(this.mask,map.spawn.x,map.spawn.y)){onState({error:'시작 위치가 마스크의 흰색 영역이 아닙니다. 모험을 시작할 수 없습니다.'});return;}
   try{this.objectives=createPreviewObjectives({mask:this.mask,spawn:map.spawn,count:startData.objectiveCount,seed:startData.seed,locationId:startData.locationId,placement:map.placement});}
   catch(error){onState({error:error.message});return;}
   this.remainingMs=startData.durationSeconds*1000;this.trackedId=this.objectives[0]?.id??null;
   this.footShadow=this.add.container(map.spawn.x,map.spawn.y+2).setDepth(9);
   for(const [width,height,alpha] of [[46,14,0.035],[38,11,0.05],[28,8,0.08]])this.footShadow.add(this.add.ellipse(0,0,width*2,height*2,0x40372e,alpha));
   this.player=this.add.sprite(map.spawn.x,map.spawn.y,'walk-S',1).setOrigin(0.5,ADVENTURE_VIEW.footY).setDisplaySize(ADVENTURE_VIEW.displaySize,ADVENTURE_VIEW.displaySize).setDepth(10);
   const npcPoints=(npcs.length?reachableSafeCandidates(this.mask,map.spawn,map.placement):[]).sort((a,b)=>Math.hypot(a.x-map.spawn.x,a.y-map.spawn.y)-Math.hypot(b.x-map.spawn.x,b.y-map.spawn.y));
   this.npcEncounters=npcs.flatMap((npc,index)=>npcPoints[index]?[{npc,point:npcPoints[index],triggered:false}]:[]);
   for(const d of ['S','SW','W','NW','N','NE','E','SE'])this.anims.create({key:'walking-'+d,frames:[0,1,2,1].map(frame=>({key:'walk-'+d,frame})),frameRate:7,repeat:-1});
   this.keys=this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');this.input.keyboard.addCapture(['W','A','S','D','UP','DOWN','LEFT','RIGHT']);
   this.input.on('pointerdown',p=>{if(this.active&&!this.paused)this.target={x:p.worldX,y:p.worldY};});
   const camera=this.cameras.main,resize=()=>{camera.setZoom(Math.max(map.zoom,this.scale.width/world.width,this.scale.height/world.height));camera.setBounds(0,0,world.width,world.height);};
   resize();camera.startFollow(this.player,true,1,1);this.scale.on('resize',resize);this.events.once('shutdown',()=>this.scale.off('resize',resize));
   this.lines=this.add.graphics().setDepth(30);this.coords=this.add.text(12,68,'',{fontFamily:'Gowun Batang',fontSize:'14px',color:'#ffffff',backgroundColor:'#000000cc',padding:{x:6,y:4}}).setScrollFactor(0).setDepth(40);
   onReady(this.snapshot());
  }
  snapshot(hint=null){return{objectives:this.objectives??[],durationSeconds:startData.durationSeconds,remainingMs:this.remainingMs,foundIds:[...this.foundIds],trackedId:this.trackedId,investigationCount:this.investigationCount,investigating:this.investigating,hint,active:this.active,paused:this.paused};}
  start(){if(!this.objectives||this.active)return false;this.active=true;this.paused=false;this.lastPublishedSecond=Math.ceil(this.remainingMs/1000);onState(this.snapshot());return true;}
  pause(value){if(!this.active)return;this.overlayPaused=Boolean(value);this.paused=this.overlayPaused||this.investigating;this.pad={x:0,y:0};if(this.paused){this.target=null;this.player?.anims.stop();}onState(this.snapshot());}
  track(id){if(this.objectives?.some(item=>item.id===id&&!this.foundIds.includes(id)))this.trackedId=id;onState(this.snapshot());}
  direction(x,y){this.pad={x,y};}
  investigate(){
   if(!this.active||this.paused||!this.player)return false;
   this.investigating=true;this.paused=true;this.pad={x:0,y:0};this.target=null;this.investigationCount++;this.player.anims.stop();onState(this.snapshot());
   const delay=1000+Math.random()*1000;
   setTimeout(()=>{
    if(this.destroyed)return;
    const result=investigateObjective({x:this.player.x,y:this.player.y},this.objectives,this.foundIds,ADVENTURE_GEOMETRY.investigationRadius,this.trackedId);
    if(result.foundId){this.foundIds.push(result.foundId);this.trackedId=this.objectives.find(item=>!this.foundIds.includes(item.id))?.id??null;}
    this.investigating=false;this.paused=this.overlayPaused;
    if(this.foundIds.length===this.objectives.length)this.active=false;
    onState(this.snapshot(result.hint));
    if(!this.active)onFinish('MISSION_COMPLETE',this.foundIds.length);
   },delay);return true;
  }
  update(_,delta){
   if(!this.player)return;
   if(this.active&&!this.paused&&!document.hidden){this.remainingMs=Math.max(0,this.remainingMs-Math.min(delta,250));const second=Math.ceil(this.remainingMs/1000);if(second!==this.lastPublishedSecond){this.lastPublishedSecond=second;onState(this.snapshot());}
    if(this.remainingMs===0){this.active=false;onState(this.snapshot());onFinish('TIMEOUT',this.foundIds.length);return;}
   }
   const k=this.keys;let dx=(k.D.isDown||k.RIGHT.isDown?1:0)-(k.A.isDown||k.LEFT.isDown?1:0),dy=(k.S.isDown||k.DOWN.isDown?1:0)-(k.W.isDown||k.UP.isDown?1:0);
   if(!this.active||this.paused||document.hidden)dx=dy=0;
   else if(dx||dy){this.target=null;}else if(this.pad.x||this.pad.y){dx=this.pad.x;dy=this.pad.y;this.target=null;}
   else if(this.target){dx=this.target.x-this.player.x;dy=this.target.y-this.player.y;if(Math.hypot(dx,dy)<3){dx=dy=0;this.target=null;}}
   const length=Math.hypot(dx,dy),before={x:this.player.x,y:this.player.y};
   if(length){const distance=Math.min(ADVENTURE_VIEW.speed*Math.min(delta,50)/1000,this.target?length:Infinity);const next=moveFoot(this.mask,before,dx/length*distance,dy/length*distance);this.player.setPosition(next.x,next.y);
    const direction=['E','SE','S','SW','W','NW','N','NE'][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
     if(next.x!==before.x||next.y!==before.y)this.player.play('walking-'+direction,true);else{this.player.anims.stop();this.player.setFrame(1);this.target=null;}
   }else{this.player.anims.stop();this.player.setFrame(1);}
   this.footShadow?.setPosition(this.player.x,this.player.y+2);this.overlay?.setVisible(this.debug);this.lines?.clear();this.coords?.setVisible(this.debug);
   if(this.active&&!this.paused){const npc=takeAdventureEncounter(this.npcEncounters??[],this.player);if(npc){this.pause(true);onEncounter(npc);}}
   if(this.debug){this.lines.lineStyle(2,0xffcc44).strokeRect(0,0,this.mask.worldWidth,this.mask.worldHeight);this.lines.fillStyle(0xff5555).fillCircle(this.player.x,this.player.y,4);this.coords.setText('발 X '+this.player.x.toFixed(1)+' / Y '+this.player.y.toFixed(1)+' · 흰색만 이동 · 전경 임시 항상 앞');}
  }
 }
 const game=new Phaser.Game({type:Phaser.AUTO,parent:host,width:host.clientWidth,height:host.clientHeight,backgroundColor:'#000000',scale:{mode:Phaser.Scale.RESIZE},scene:[AdventureScene]});
 const scene=()=>game.scene.getScene('adventure');
 return{start(){return scene().start();},pause(value){scene().pause(value);},track(id){scene().track(id);},direction(x,y){scene().direction(x,y);},investigate(){return scene().investigate();},destroy(){const current=scene();current.destroyed=true;game.destroy(true);}};
}
