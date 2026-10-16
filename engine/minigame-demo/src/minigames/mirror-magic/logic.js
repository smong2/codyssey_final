export const LEVELS = [
  { width:7,height:6,source:[0,2],direction:[1,0],goal:[3,0],mirrors:[[3,2,'/']],blocks:[[5,2]] },
  { width:7,height:6,source:[0,4],direction:[1,0],goal:[6,1],mirrors:[[2,4,'/'],[2,1,'/'],[5,4,'\\']],blocks:[[4,4],[4,2]] },
  { width:7,height:6,source:[0,5],direction:[1,0],goal:[5,4],rune:[2,3],prism:[2,3],secondaryGoal:[4,0],mirrors:[[2,5,'/'],[2,1,'/'],[5,1,'\\'],[4,3,'/']],blocks:[[4,5],[6,2]] },
];
export const key = (x,y) => `${x},${y}`;
export function reflect([dx,dy], orientation) { return orientation === '/' ? [dy === 0 ? 0 : -dy, dx === 0 ? 0 : -dx] : [dy,dx]; }
export function traceBeam(level, orientations) {
  const mirrors = new Map(level.mirrors.map(([x,y,orientation],i) => [key(x,y), orientations?.[i] ?? orientation]));
  const blocks = new Set(level.blocks.map(([x,y]) => key(x,y)));
  const rays=[{x:level.source[0],y:level.source[1],dx:level.direction[0],dy:level.direction[1],path:[level.source],split:false}];
  const paths=[], reached=new Set(), outcomes=[];let runeVisited=false;
  for(let head=0;head<rays.length;head++){
    const ray=rays[head],states=new Set();let {x,y,dx,dy}=ray;
    for(let step=0;step<level.width*level.height*4;step++){
      const state=`${x},${y},${dx},${dy}`;
      if(states.has(state)){outcomes.push('loop');break;}states.add(state);
      x+=dx;y+=dy;
      if(x<0||y<0||x>=level.width||y>=level.height){outcomes.push('edge');break;}
      ray.path.push([x,y]);
      if(blocks.has(key(x,y))){outcomes.push('block');break;}
      if(level.rune&&x===level.rune[0]&&y===level.rune[1])runeVisited=true;
      if(level.prism&&!ray.split&&x===level.prism[0]&&y===level.prism[1]){
        rays.push({x,y,dx:-dy,dy:dx,path:[[x,y]],split:true});ray.split=true;
      }
      if(x===level.goal[0]&&y===level.goal[1]){reached.add('primary');outcomes.push('goal');break;}
      if(level.secondaryGoal&&x===level.secondaryGoal[0]&&y===level.secondaryGoal[1]){reached.add('secondary');outcomes.push('goal');break;}
      if(mirrors.has(key(x,y)))[dx,dy]=reflect([dx,dy],mirrors.get(key(x,y)));
    }
    paths.push(ray.path);
  }
  return {path:paths[0],paths,outcome:outcomes[0]||'loop',runeVisited,
    success:reached.has('primary')&&(!level.secondaryGoal||reached.has('secondary'))&&(!level.rune||runeVisited)};
}
