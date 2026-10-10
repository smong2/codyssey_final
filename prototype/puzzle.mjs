// N/E/S/W bits. Geometry and solution are independent of artwork.
export const bits=[1,2,4,8];
export function ports(mask,turns){for(let i=0;i<turns;i++)mask=((mask<<1)&15)|((mask>>3)&1);return mask;}
export function initialPuzzle(){return {masks:[2,10,12,6,10,9,3,10,8],rotations:[0,1,1,1,1,1,1,1,0],solution:[0,0,0,0,0,0,0,0,0]};}
export function rotate(p,i){if(i!==0&&i!==8)p.rotations[i]=(p.rotations[i]+1)%4;}
export function reachable(p){
 const seen=new Set([0]),queue=[0],dirs=[[-3,1,4],[1,2,8],[3,4,1],[-1,8,2]];
 while(queue.length){const i=queue.shift(),mask=ports(p.masks[i],p.rotations[i]);for(const [d,out,input] of dirs){const j=i+d;if(j<0||j>8||(d===1&&i%3===2)||(d===-1&&i%3===0))continue;if((mask&out)&&(ports(p.masks[j],p.rotations[j])&input)&&!seen.has(j)){seen.add(j);queue.push(j);}}}return seen;
}
export const connected=p=>reachable(p).has(8);
