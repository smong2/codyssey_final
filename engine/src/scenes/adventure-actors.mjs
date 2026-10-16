export function addAdventureNpc(scene,npc,point,onInteract){
 scene.add.ellipse(point.x,point.y+3,64,18,0x40372e,.16).setDepth(9);
 const sprite=scene.add.sprite(point.x,point.y,'npc-'+npc.id,1).setOrigin(.5,218/256).setDisplaySize(224,224).setDepth(10).setInteractive({useHandCursor:true,pixelPerfect:true});
 const label=scene.add.text(point.x,point.y-186,npc.name+' · 대화',{fontFamily:'Gowun Batang',fontSize:'21px',color:'#fff8e8',backgroundColor:'#314b40e8',padding:{x:10,y:6}}).setOrigin(.5,1).setDepth(16).setInteractive({useHandCursor:true});
 sprite.on('pointerdown',onInteract);label.on('pointerdown',onInteract);
 return sprite;
}
