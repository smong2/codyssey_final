export function tapAllowed(start,end){return !!start&&end.time-start.time<650&&Math.hypot(end.x-start.x,end.y-start.y)<10;}
export function cardClickAllowed(suppressed,detail){return detail===0||!suppressed;}
export function joystickVector(dx,dy,radius){const length=Math.hypot(dx,dy);if(length<6)return {x:0,y:0};const factor=Math.max(radius,length);return {x:dx/factor,y:dy/factor};}
export function viewportSize(width,height){const ratio=Math.min(1,1280/width);return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};}
