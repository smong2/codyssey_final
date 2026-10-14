// Coordinates are world-space foot points; only opaque pure white is walkable.
export function canWalk(mask,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=mask.worldWidth||y>=mask.worldHeight)return false;
 const mx=Math.floor(x/mask.worldWidth*mask.width),my=Math.floor(y/mask.worldHeight*mask.height),i=(my*mask.width+mx)*4;
 return mask.pixels[i]===255&&mask.pixels[i+1]===255&&mask.pixels[i+2]===255&&mask.pixels[i+3]===255;
}
export function moveFoot(mask,point,dx,dy){
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||!canWalk(mask,point.x,point.y))return {...point};
 const step=Math.min(mask.worldWidth/mask.width,mask.worldHeight/mask.height)/2;
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dy)/step));
 let {x,y}=point;
 for(let n=0;n<count;n++){
  if(canWalk(mask,x+dx/count,y+dy/count)){x+=dx/count;y+=dy/count;}
  else {if(canWalk(mask,x+dx/count,y))x+=dx/count;if(canWalk(mask,x,y+dy/count))y+=dy/count;}
 }
 return {x,y};
}
