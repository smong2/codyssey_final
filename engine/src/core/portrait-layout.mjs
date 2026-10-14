export function fitPortraitBounds(stageWidth,stageHeight,sourceWidth,sourceHeight,bounds){
 const scale=Math.min(stageWidth/bounds.width,stageHeight/bounds.height);
 return {width:sourceWidth*scale,height:sourceHeight*scale,left:(stageWidth-bounds.width*scale)/2-bounds.x*scale,top:stageHeight-(bounds.y+bounds.height)*scale};
}
