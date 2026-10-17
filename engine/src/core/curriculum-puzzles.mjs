import {makeRng} from '../../minigame-demo/src/minigames/shared/rng.js';
import {buildBoard,connections} from '../../minigame-demo/src/minigames/rune-circuit/logic.js';
import {LEVELS,traceBeam} from '../../minigame-demo/src/minigames/mirror-magic/logic.js';

export function circuitStage(difficulty,seed,round=0){
 const index=difficulty===1?0:difficulty===2?1:2,board=buildBoard(index,seed+':'+round);
 if(difficulty===3)board.branchGoal=null;
 if(!connections({...board,tiles:board.solved}).won)throw new Error('회로 해답 검증 실패');
 return board;
}
export function mirrorStage(difficulty,seed,round=0){
 const level=structuredClone(LEVELS[difficulty<=2?difficulty-1:2]);
 if(difficulty===1)level.blocks=[];
 if(difficulty===3){level.prism=null;level.secondaryGoal=null;}
 let solution=null;
 for(let mask=0;mask<2**level.mirrors.length;mask++){const values=level.mirrors.map((_,i)=>mask&(1<<i)?'/':'\\');if(traceBeam(level,values).success){solution=values;break;}}
 if(!solution)throw new Error('거울 해답 검증 실패');
 const rng=makeRng(seed+':mirror:'+round),orientations=solution.map(value=>rng()<.5?value:value==='/'?'\\':'/');
 if(traceBeam(level,orientations).success)orientations[0]=orientations[0]==='/'?'\\':'/';
 return {level,orientations,solution};
}
export const potsSolved=pots=>pots.every(pot=>!pot.length||pot.length===4&&pot.every(color=>color===pot[0]));
export function pourPot(pots,from,to){
 if(from===to||!pots[from]?.length||!Array.isArray(pots[to]))return false;
 const source=pots[from],target=pots[to],color=source.at(-1);if(target.length>=4||target.length&&target.at(-1)!==color)return false;
 let count=0;for(let i=source.length-1;i>=0&&source[i]===color;i--)count++;
 count=Math.min(count,4-target.length);target.push(...source.splice(source.length-count,count));return count>0;
}
export function potStage(difficulty,seed){
 const colors=difficulty+2,pots=Array.from({length:colors},(_,i)=>Array(4).fill(i));pots.push([],[]);
 const rng=makeRng(seed+':pots'),reverse=[];
 for(let step=0;step<12+difficulty*6;step++){
  const candidates=[];
  for(let a=0;a<pots.length;a++)if(pots[a].length){const color=pots[a].at(-1);let group=0;for(let i=pots[a].length-1;i>=0&&pots[a][i]===color;i--)group++;
   for(let b=0;b<pots.length;b++)if(a!==b&&pots[b].length<4&&pots[b].at(-1)!==color)for(let count=1;count<=Math.min(group,4-pots[b].length);count++)if(count<group||group===pots[a].length)candidates.push([a,b,count]);
  }
  if(!candidates.length)break;const [a,b,count]=candidates[Math.floor(rng()*candidates.length)];pots[b].push(...pots[a].splice(pots[a].length-count,count));reverse.unshift([b,a]);
 }
 const check=structuredClone(pots);for(const [a,b]of reverse)if(!pourPot(check,a,b))throw new Error('화분 해답 검증 실패');
 if(!potsSolved(check))throw new Error('화분 완성 검증 실패');
 return {pots,solution:reverse,greatMoveLimit:reverse.length};
}
export function moveShelf(pieces,id,delta){
 const item=pieces.find(piece=>piece.id===id);if(!item||!Number.isInteger(delta)||!delta)return false;
 const old=item.axis==='h'?item.x:item.y,sign=Math.sign(delta);
 for(let step=1;step<=Math.abs(delta);step++){
  const x=item.x+(item.axis==='h'?sign*step:0),y=item.y+(item.axis==='v'?sign*step:0);
  if(x<0||y<0||x+(item.axis==='h'?item.length:1)>6||y+(item.axis==='v'?item.length:1)>6)return false;
  for(let offset=0;offset<item.length;offset++){const px=x+(item.axis==='h'?offset:0),py=y+(item.axis==='v'?offset:0);
   if(pieces.some(other=>other!==item&&px>=other.x&&py>=other.y&&px<other.x+(other.axis==='h'?other.length:1)&&py<other.y+(other.axis==='v'?other.length:1)))return false;
  }
 }
 item[item.axis==='h'?'x':'y']=old+delta;return true;
}
export const shelvesSolved=pieces=>pieces.find(piece=>piece.id==='A').x===4;
export function shelfStage(difficulty,round=0){
 const pieces=[{id:'A',x:4,y:2,axis:'h',length:2},{id:'B',x:2,y:3,axis:'v',length:3},{id:'C',x:3,y:0,axis:'v',length:2}];
 if(difficulty>=2)pieces.push({id:'H',x:3,y:4,axis:'h',length:3});
 if(difficulty>=3)pieces.push({id:'D',x:5,y:0,axis:'v',length:2});
 if(difficulty>=4)pieces.push({id:'E',x:4,y:0,axis:'v',length:2});
 const reverse=[['A',-4],['B',-3],['C',1],...(difficulty>=2?[['H',-3]]:[]),...(difficulty>=3?[['D',3]]:[]),...(difficulty>=4?[['E',3]]:[])];
 for(const [id,delta]of reverse)if(!moveShelf(pieces,id,delta))throw new Error('서가 배치 검증 실패');
 const solution=reverse.reverse().map(([id,delta])=>[id,-delta]);
 if(round%2)for(const piece of pieces)piece.y=6-piece.y-(piece.axis==='v'?piece.length:1);
 if(round%2)for(const move of solution)if(pieces.find(piece=>piece.id===move[0]).axis==='v')move[1]*=-1;
 const check=structuredClone(pieces);for(const [id,delta]of solution)if(!moveShelf(check,id,delta))throw new Error('서가 해답 검증 실패');
 if(!shelvesSolved(check))throw new Error('서가 출구 검증 실패');
 return {pieces,solution,greatMoveLimit:solution.reduce((sum,[,delta])=>sum+Math.abs(delta),0)+2};
}
export function rhythmPattern(difficulty,seed,durationMs=75000){
 const rng=makeRng(seed+':rhythm'),lanes=difficulty===1?2:3,beat=60000/(72+difficulty*12),notes=[];
 for(let at=1500,index=0;at<durationMs-1800;at+=beat,index++){
  const lane=Math.floor(rng()*lanes),hold=difficulty>=3&&index%9===5?beat*.8:0;
  notes.push({lane,at,hold});if(difficulty>=3&&index%7===3)notes.push({lane:(lane+1)%lanes,at:at+beat*.45,hold:0});if(difficulty===4&&index%11===7)notes.push({lane:(lane+1)%lanes,at,hold:0});
  if(difficulty===4&&at>=25000&&at<45000)at-=beat*.25;
 }
 return {lanes,notes};
}
export function pinRotation(difficulty,elapsedMs){
 const t=elapsedMs/1000,base=.65+difficulty*.28;
 if(difficulty<=2)return base*t;
 if(difficulty===3)return base*(t+Math.sin(t*1.6)*.7);
 const phase=t%5.2;
 return phase<2?base*(1-Math.cos(Math.PI*phase/2)):phase<2.6?2*base:phase<4.6?base*(1+Math.cos(Math.PI*(phase-2.6)/2)):0;
}
export function firePin(pins,difficulty,elapsedMs){
 const tau=Math.PI*2,angle=((Math.PI/2-pinRotation(difficulty,elapsedMs))%tau+tau)%tau;
 const distance=a=>Math.abs(Math.atan2(Math.sin(angle-a),Math.cos(angle-a)));
 if(pins.some(pin=>distance(pin)<.25)||difficulty===4&&distance(0)<.4)return false;
 pins.push(angle);return true;
}
