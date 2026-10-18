import {CLASSES} from '../core/classes.mjs';
import {curriculumResult} from '../core/curriculum.mjs';
import {circuitStage,mirrorStage,potStage,pourPot,potsSolved,shelfStage,moveShelf,shelvesSolved,rhythmPattern,pinRotation,firePin} from '../core/curriculum-puzzles.mjs';
import {rotate,connections} from '../core/circuit-logic.mjs';
import {traceBeam} from '../core/mirror-logic.mjs';
import {SPACES} from '../core/spaces.mjs';

const ART={observatory:'BG05_starlight_observatory_1920x1080_015.png',plaza:'BG02_clocktower_plaza_1920x1080_011.png',greenhouse:'BG06_glass_greenhouse_1920x1080_016.png',library:'BG04_grand_library_1920x1080_014.png',workshop:'BG08_magic_workshop_1920x1080_018.png',training:'BG09_rune_training_ground_1920x1080_019.png'};
const COLORS=['#de8b82','#8ca97f','#8da8c0','#c5a15f','#aa90bd','#81b7ac'];
const GUIDES={
 'observatory-mirror':['거울을 눌러 별빛의 방향을 바꿔요.','별빛이 모든 관측 룬에 닿으면 다음 단계로 넘어가요.'],
 'starlight-stage':['별빛이 아래 선에 닿을 때 같은 레인을 눌러요.','길게 이어진 별빛은 끝날 때까지 누르고 있어요.'],
 'spirit-pot-sort':['화분 두 개를 차례로 골라 꽃빛을 옮겨요.','각 화분에 같은 꽃빛만 모으면 성공이에요.'],
 'sealed-shelves':['옮길 책 묶음을 고른 뒤 화살표를 눌러요.','별이 표시된 고서 A를 오른쪽 출구로 보내요.'],
 'rune-circuit':['회로 조각을 눌러 방향을 돌려요.','마력 발생점부터 모든 목표까지 길을 이어요.'],
 'rune-pin-training':['원판의 빈 곳을 보고 룬 핀을 보내요.','다른 핀과 보호 구역을 피해서 세 라운드를 마쳐요.']
};
const guideKey=id=>'lumia:minigame-guide:'+id;
const hasSeenGuide=id=>{try{return globalThis.localStorage?.getItem(guideKey(id))==='1';}catch{return false;}};
const rememberGuide=id=>{try{globalThis.localStorage?.setItem(guideKey(id),'1');}catch{}};
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined&&text!==null)node.textContent=text;if(cls)node.className=cls;return node;}
function svgNode(tag,attrs={}){
 const node=typeof document.createElementNS==='function'?document.createElementNS('http://www.w3.org/2000/svg',tag):document.createElement(tag);
 for(const [k,v] of Object.entries(attrs)){
  if(k==='textContent')node.textContent=v;
  else if(k==='class'&&!node.setAttribute)node.className=v;
  else if(typeof node.setAttribute==='function')node.setAttribute(k,v);
 }
 return node;
}
function pipeSvg(mask,isLit,{isStart,isGoal,isMandatory,isFixed}={}){
 const svg=svgNode('svg',{viewBox:'0 0 256 256',class:'pipe-svg'});
 const gOuter=svgNode('g',{fill:'none',stroke:'#b39762','stroke-width':'24','stroke-linecap':'round','stroke-linejoin':'round'});
 const gInner=svgNode('g',{fill:'none',stroke:isLit?'#418d89':'#756859','stroke-width':'14','stroke-linecap':'round','stroke-linejoin':'round'});
 let d='';
 if(mask===3)d='M 128 0 V 64 Q 128 128 192 128 H 256';
 else if(mask===6)d='M 256 128 H 192 Q 128 128 128 192 V 256';
 else if(mask===12)d='M 128 256 V 192 Q 128 128 64 128 H 0';
 else if(mask===9)d='M 0 128 H 64 Q 128 128 128 64 V 0';
 else if(mask===5)d='M 128 0 V 256';
 else if(mask===10)d='M 0 128 H 256';
 else{
  if(mask&1)d+='M 128 128 V 0 ';
  if(mask&2)d+='M 128 128 H 256 ';
  if(mask&4)d+='M 128 128 V 256 ';
  if(mask&8)d+='M 128 128 H 0 ';
 }
 if(d){
  gOuter.append(svgNode('path',{d:d.trim()}));
  gInner.append(svgNode('path',{d:d.trim()}));
  svg.append(gOuter,gInner);
  if(isLit){
   const gGlow=svgNode('g',{fill:'none',stroke:'#9efff4','stroke-width':'4','stroke-linecap':'round','stroke-linejoin':'round'});
   gGlow.append(svgNode('path',{d:d.trim()}));
   svg.append(gGlow);
  }
 }
 if(isStart){
  svg.append(
   svgNode('circle',{cx:'128',cy:'128',r:'28',fill:isLit?'#418d89':'#756859',stroke:'#b39762','stroke-width':'6'}),
   svgNode('circle',{cx:'128',cy:'128',r:'14',fill:isLit?'#a6fff5':'#c3b5a1'})
  );
 }else if(isGoal){
  svg.append(
   svgNode('path',{d:'M 128 94 L 162 128 L 128 162 L 94 128 Z',fill:isLit?'#418d89':'#756859',stroke:'#b39762','stroke-width':'6'}),
   svgNode('path',{d:'M 128 108 L 148 128 L 128 148 L 108 128 Z',fill:isLit?'#a6fff5':'#c3b5a1'})
  );
 }else if(isMandatory){
  svg.append(
   svgNode('path',{d:'M 128 98 L 137 119 L 160 119 L 141 133 L 148 155 L 128 141 L 108 155 L 115 133 L 96 119 L 119 119 Z',fill:isLit?'#ffd483':'#9d885a',stroke:'#b39762','stroke-width':'4'})
  );
 }else if(mask!==3&&mask!==6&&mask!==12&&mask!==9&&mask!==5&&mask!==10&&mask>0){
  svg.append(svgNode('circle',{cx:'128',cy:'128',r:'14',fill:isLit?'#418d89':'#756859',stroke:'#b39762','stroke-width':'4'}));
 }
 if(isFixed){
  for(const [fx,fy] of [[28,28],[228,28],[28,228],[228,228]]){
   svg.append(svgNode('circle',{cx:String(fx),cy:String(fy),r:'6',fill:'#6d6255',stroke:'#b39762','stroke-width':'2'}));
  }
 }
 return svg;
}
function mirrorSvg(cellType,orientation,isLit){
 const svg=svgNode('svg',{viewBox:'0 0 256 256',class:'mirror-svg'});
 if(cellType==='mirror'){
  const d=orientation==='/'?'M 40 216 L 216 40':'M 40 40 L 216 216';
  svg.append(
   svgNode('path',{d,fill:'none',stroke:'#b39762','stroke-width':'20','stroke-linecap':'round'}),
   svgNode('path',{d,fill:'none',stroke:isLit?'#80d8ff':'#cfd8dc','stroke-width':'10','stroke-linecap':'round'})
  );
  if(isLit)svg.append(svgNode('path',{d,fill:'none',stroke:'#ffffff','stroke-width':'3','stroke-linecap':'round'}));
 }else if(cellType==='source'){
  svg.append(
   svgNode('circle',{cx:'128',cy:'128',r:'32',fill:'#ffd54f',stroke:'#b39762','stroke-width':'6'}),
   svgNode('circle',{cx:'128',cy:'128',r:'14',fill:'#fff9c4'})
  );
 }else if(cellType==='block'){
  svg.append(svgNode('rect',{x:'44',y:'44',width:'168',height:'168',rx:'16',fill:'#546e7a',stroke:'#37474f','stroke-width':'6'}));
 }else if(cellType==='goal'){
  svg.append(
   svgNode('circle',{cx:'128',cy:'128',r:'36',fill:'none',stroke:isLit?'#4dd0e1':'#b39762','stroke-width':'8'}),
   svgNode('circle',{cx:'128',cy:'128',r:'16',fill:isLit?'#80deea':'#756859'})
  );
 }else if(cellType==='rune'){
  svg.append(
   svgNode('path',{d:'M 128 72 L 184 128 L 128 184 L 72 128 Z',fill:isLit?'#ba68c8':'#756859',stroke:'#b39762','stroke-width':'6'}),
   svgNode('path',{d:'M 128 96 L 160 128 L 128 160 L 96 128 Z',fill:isLit?'#e1bee7':'#9e9e9e'})
  );
 }else if(cellType==='prism'){
  svg.append(svgNode('polygon',{points:'128,68 188,172 68,172',fill:isLit?'#80deea':'#78909c',stroke:'#b39762','stroke-width':'6'}));
 }
 return svg;
}
function button(text,action){const node=el('button',text);node.type='button';node.onclick=action;return node;}
export const curriculumScenes=CLASSES.map(lesson=>class extends Phaser.Scene{
 constructor(){super(lesson.sceneKey);this.gameId=lesson.id;}
 init(data){this.startData=data;this.round=0;this.moves=0;this.mistakes=0;this.hits=0;this.extras=0;this.greatLimit=0;this.done=false;this.pausedMs=0;this.selected=null;this.history=[];this.inputLog=[];this.pattern=null;this.disc=null;this.solved=false;this.roundStarted=0;}
 create(){
  this.startedAt=performance.now();this.root=el('section',null,'curriculum-game');
  const bg=SPACES[lesson.locationId]?.image??ART[lesson.locationId];
  this.root.style.backgroundImage=`linear-gradient(#203126bb,#203126bb),url('./world-assets/${bg}')`;
  const header=el('header',null,'paper curriculum-header');this.timer=el('span','');header.append(el('h1',lesson.title),this.timer,button('게임 방법 보기',()=>this.showGuide()),button('포기하기',()=>this.quit()));
  this.instruction=el('p','', 'curriculum-instruction');this.board=el('div',null,'paper curriculum-board');this.status=el('p','', 'curriculum-status');
  this.root.append(header,this.instruction,this.board,this.status);document.querySelector('#game').append(this.root);
  this.events.once('shutdown',()=>{this.done=true;this.root?.remove();});
  if(this.startData.assistLevel)this.status.textContent='조금 더 쉬운 연습으로 준비했어.';
  this.loadRound();if(!hasSeenGuide(this.gameId))this.showGuide(true);
 }
 showGuide(first=false){
  if(this.guideOverlay||this.done)return;
  const openedAt=performance.now(),overlay=el('div',null,'curriculum-guide-overlay'),panel=el('section',null,'paper curriculum-guide');
  panel.append(el('small',first?'처음 한 번만 자동으로 보여 줘요.':'게임 방법'),el('h2',lesson.title+' 방법'));
  const list=el('ol');for(const line of GUIDES[this.gameId]??[])list.append(el('li',line));panel.append(list);
  const close=button('알겠어!',()=>{this.pausedMs+=performance.now()-openedAt;rememberGuide(this.gameId);overlay.remove();this.guideOverlay=null;});panel.append(close);overlay.append(panel);this.root.append(overlay);this.guideOverlay=overlay;close.focus?.();
 }
 elapsed(){return Math.max(0,performance.now()-this.startedAt-this.pausedMs);}
 logInput(action,data={},at=this.elapsed()){
  const limit=Math.max(0,Math.floor(this.startData.maxDurationMs)-1),atMs=Math.max(0,Math.min(limit,Math.floor(at)));
  const event={atMs,action,...data};this.inputLog.push(event);return event;
 }
 quit(){if(this.done)return;const before=performance.now(),accepted=window.confirm('이 수업을 포기할까요? 사용한 체력과 일정은 돌아오지 않아요.');this.pausedMs+=performance.now()-before;if(accepted)this.finish('QUIT');}
 finish(endReason='COMPLETE'){
  if(this.done)return;this.done=true;const elapsed=this.elapsed(),remainingMs=Math.max(0,this.startData.maxDurationMs-elapsed);
  const metrics={roundsCleared:this.round,moves:this.moves,greatMoveLimit:this.greatLimit,mistakes:this.mistakes,solved:this.solved??false,hits:this.hits,total:this.pattern?this.pattern.notes.length+this.extras:0};
  const result={...curriculumResult(this.startData,{metrics,remainingMs,endReason,durationMs:elapsed,score:this.hits||this.round*100}),inputLog:structuredClone(this.inputLog)};
  this.scene.start('home');this.game.events.emit(endReason==='QUIT'?'minigame:quit':'minigame:complete',result);
 }
 completeRound(){if(this.done)return;this.round++;if(this.round===3)this.finish();else{this.selected=null;this.history=[];this.loadRound();}}
 loadRound(){
  const d=this.startData.difficulty,seed=this.startData.seed;
  if(this.gameId==='starlight-stage'){this.loadRhythm();return;}
  if(this.gameId==='rune-pin-training'){this.loadPins();return;}
  if(this.gameId==='rune-circuit')this.puzzle=circuitStage(d,seed,this.round);
  if(this.gameId==='observatory-mirror')this.puzzle=mirrorStage(d,seed,this.round);
  if(this.gameId==='spirit-pot-sort'){this.puzzle=potStage(d,seed);this.greatLimit=this.puzzle.greatMoveLimit;}
  if(this.gameId==='sealed-shelves'){this.puzzle=shelfStage(d,this.round);this.greatLimit+=this.puzzle.greatMoveLimit;this.originalPieces=structuredClone(this.puzzle.pieces);}
  this.drawPuzzle();
 }
 drawPuzzle(){
  this.board.replaceChildren();this.board.className='paper curriculum-board';
  if(this.gameId==='spirit-pot-sort'){
   this.instruction.textContent='화분을 고른 뒤 옮길 화분을 누르세요. 같은 꽃빛끼리 모아 주세요.';const grid=el('div',null,'course-pots');
   this.puzzle.pots.forEach((pot,index)=>{const b=button('',()=>{if(this.done)return;if(this.selected===null){this.selected=index;this.drawPuzzle();return;}const source=this.selected;if(pourPot(this.puzzle.pots,source,index)){this.logInput('POUR',{fromPot:source,toPot:index});this.moves++;if(potsSolved(this.puzzle.pots)){this.solved=true;this.finish();return;}}this.selected=null;this.drawPuzzle();});b.setAttribute('aria-label',`${index+1}번 화분 · ${pot.length} / 4`);b.classList.toggle('selected',this.selected===index);for(let row=3;row>=0;row--){const color=pot[row],part=el('span',color===undefined?'':String(color+1));part.style.background=color===undefined?'#f4ecd8':COLORS[color];b.append(part);}grid.append(b);});this.board.append(grid);this.status.textContent='이동 '+this.moves+'회';return;
  }
  if(this.gameId==='sealed-shelves'){
   this.instruction.textContent='책 묶음을 고르고 화살표로 미세요. 별 고서 A를 오른쪽 출구로 보내세요.';
   const grid=el('div',null,'course-grid course-shelves');grid.style.setProperty('--columns',6);
   for(let y=0;y<6;y++)for(let x=0;x<6;x++){
    const piece=this.puzzle.pieces.find(p=>x>=p.x&&y>=p.y&&x<p.x+(p.axis==='h'?p.length:1)&&y<p.y+(p.axis==='v'?p.length:1));
    const b=button(piece?(piece.id==='A'?'★':piece.id):'·',()=>{this.selected=piece?.id??null;this.drawPuzzle();});b.disabled=!piece;b.classList.toggle('selected',piece?.id===this.selected);b.classList.toggle('shelf-goal',piece?.id==='A');grid.append(b);
   }
   const controls=el('nav',null,'course-controls');for(const [label,axis,delta]of [['←','h',-1],['→','h',1],['↑','v',-1],['↓','v',1]]){const b=button(label,()=>{if(this.done)return;const piece=this.puzzle.pieces.find(p=>p.id===this.selected);if(piece?.axis!==axis)return;const before=structuredClone(this.puzzle.pieces),pieceId=this.selected;if(moveShelf(this.puzzle.pieces,pieceId,delta)){this.logInput('MOVE',{pieceId,delta});this.history.push(before);this.moves++;if(shelvesSolved(this.puzzle.pieces)){this.completeRound();return;}this.drawPuzzle();}});b.disabled=!this.selected;controls.append(b);}
   controls.append(button('되돌리기',()=>{if(!this.history.length||this.done)return;this.puzzle.pieces=this.history.pop();this.logInput('UNDO');this.moves++;this.drawPuzzle();}),button('현재 판 초기화',()=>{if(this.done)return;this.history.push(structuredClone(this.puzzle.pieces));this.puzzle.pieces=structuredClone(this.originalPieces);this.logInput('RESET');this.moves++;this.drawPuzzle();}));this.board.append(grid,controls);this.status.textContent=`${this.round+1} / 3 서가 · 이동 ${this.moves}회`;return;
  }
  const mirror=this.gameId==='observatory-mirror',p=this.puzzle,width=mirror?p.level.width:p.size,height=mirror?p.level.height:p.size;
  this.instruction.textContent=mirror?'거울을 눌러 별빛을 돌리세요. 관측 룬을 모두 밝혀 주세요.':'회로를 눌러 돌리세요. 고정 회로는 움직이지 않아요. 모든 목표까지 연결하세요.';
  const grid=el('div',null,'course-grid');grid.style.setProperty('--columns',width);
  const light=mirror?traceBeam(p.level,p.orientations):connections(p),path=mirror?new Set(light.paths.flat().map(([x,y])=>x+','+y)):light.reached;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   let disabled=false,index=y*width+x;
   const point=coord=>coord?.[0]===x&&coord?.[1]===y;
   const isLit=path.has(mirror?x+','+y:index);
   let marker=null,aria='',b;
   if(mirror){
    index=p.level.mirrors.findIndex(([mx,my])=>mx===x&&my===y);
    disabled=index<0;
    const isSource=point(p.level.source),isBlock=p.level.blocks.some(([bx,by])=>bx===x&&by===y),isGoal=point(p.level.goal)||point(p.level.secondaryGoal),isRune=point(p.level.rune),isPrism=point(p.level.prism);
    marker=isPrism?'분기':isRune?'필수 룬':isSource?'광원':isGoal?'목표':null;
    const cellType=index>=0?'mirror':isSource?'source':isBlock?'block':isGoal?'goal':isRune?'rune':isPrism?'prism':'empty';
    const orient=index>=0?p.orientations[index]:null;
    aria=(marker?marker+' · ':'')+(index>=0?'거울 ('+orient+')':'빈 칸');
    b=button('',()=>{if(this.done)return;p.orientations[index]=p.orientations[index]==='/'?'\\':'/';this.logInput('TOGGLE',{mirrorIndex:index});this.moves++;if(traceBeam(p.level,p.orientations).success)this.completeRound();else this.drawPuzzle();});
    b.className='mirror-cell';
    b.append(mirrorSvg(cellType,orient,isLit));
   }else{
    const isStart=point(p.start),isGoal=point(p.goal)||point(p.branchGoal),isMandatory=point(p.mandatory);
    const isFixed=p.fixed?.some(([fx,fy])=>fx===x&&fy===y);
    disabled=[p.start,p.goal,p.branchGoal,...p.fixed].filter(Boolean).some(([px,py])=>px===x&&py===y);
    marker=isStart?'광원':isGoal?'목표':isMandatory?'필수 룬':isFixed?'고정':null;
    aria=(marker?marker+' · ':'')+(isFixed?'고정 회로 · ':'')+`회로 (${x+1},${y+1})`;
    b=button('',()=>{if(this.done)return;p.tiles[index]=rotate(p.tiles[index]);this.logInput('ROTATE',{cellIndex:index});this.moves++;if(connections(p).won)this.completeRound();else this.drawPuzzle();});
    b.className='pipe-cell';
    if(isFixed)b.classList.add('fixed-cell');
    b.append(pipeSvg(p.tiles[index],isLit,{isStart,isGoal,isMandatory,isFixed}));
   }
   b.disabled=disabled;b.classList.toggle('lit',isLit);
   if(marker)b.append(el('small',marker,'course-cell-label'));
   b.setAttribute('aria-label',aria);grid.append(b);
  }
  this.board.append(grid);this.status.textContent=`${this.round+1} / 3 단계 · 조작 ${this.moves}회`;
 }
 loadRhythm(){
  this.pattern=rhythmPattern(this.startData.difficulty,this.startData.seed,this.startData.maxDurationMs);this.board.replaceChildren();this.board.className='paper curriculum-board course-rhythm';this.instruction.textContent='별빛이 아래 선에 닿을 때 해당 레인을 누르세요. 긴 별빛은 끝까지 눌러 주세요.';
  this.lanes=[];for(let lane=0;lane<this.pattern.lanes;lane++){
   const b=button(['표정','몸짓','마법 연출'][lane],()=>{});b.className='course-rhythm-lane';b.onpointerdown=event=>{event.preventDefault();b.setPointerCapture(event.pointerId);this.hitLane(lane,false);};const release=()=>this.hitLane(lane,true);b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;this.lanes.push(b);this.board.append(b);
  }
  this.pattern.notes.forEach(note=>{note.element=el('span','✦','course-note');note.element.style.height=Math.max(20,note.hold*.1)+'px';this.lanes[note.lane].append(note.element);});
 }
 hitLane(lane,release){
  if(this.done)return;const elapsed=this.logInput(release?'RELEASE':'PRESS',{lane}).atMs;
  if(release){const note=this.pattern.notes.find(n=>n.lane===lane&&n.pressed&&!n.hit);if(note){note.hit=elapsed>=note.at+note.hold-140;note.missed=!note.hit;note.pressed=false;}return;}
  const note=this.pattern.notes.filter(n=>n.lane===lane&&!n.hit&&!n.missed&&!n.pressed&&Math.abs(n.at-elapsed)<=160).sort((a,b)=>Math.abs(a.at-elapsed)-Math.abs(b.at-elapsed))[0];
  if(!note){this.extras++;return;}if(note.hold)note.pressed=true;else note.hit=true;
 }
 loadPins(){
  this.pins=[];this.pinTarget=4+this.startData.difficulty+this.round;
  this.board.replaceChildren();this.board.className='paper curriculum-board course-pin-board';this.instruction.textContent='회전 원판에 핀을 꽂으세요. 다른 핀과 보호 구역을 피하세요.';
  this.disc=el('div',this.startData.difficulty===4?'보호 구역':'✦','course-pin-disc');if(this.startData.difficulty===4)this.disc.classList.add('has-protected-sector');this.board.append(this.disc,button('룬 핀 보내기',()=>{
   if(this.done)return;const atMs=this.logInput('FIRE').atMs;if(!firePin(this.pins,this.startData.difficulty,atMs-this.roundStarted)){this.mistakes++;if(this.mistakes>=3){this.finish('COMPLETE');return;}}
   else if(this.pins.length>=this.pinTarget){this.roundStarted=atMs;this.completeRound();return;}
   this.disc.replaceChildren(el('span','✦'));for(const angle of this.pins){const pin=el('i');pin.style.transform=`rotate(${angle+Math.PI/2}rad)`;this.disc.append(pin);}
  }));
 }
 update(){
  if(this.done||!this.root)return;const elapsed=this.elapsed(),left=Math.max(0,this.startData.maxDurationMs-elapsed);this.timer.textContent=`남은 시간 ${Math.ceil(left/1000)}초`;
  if(this.pattern){for(const note of this.pattern.notes){if(!note.hit&&!note.pressed&&elapsed>note.at+160)note.missed=true;if(note.pressed&&elapsed>note.at+note.hold+500){note.pressed=false;note.missed=true;}note.element.hidden=note.hit||note.missed;note.element.style.bottom=`${45+(note.at-elapsed)*.1}px`;}this.hits=this.pattern.notes.filter(n=>n.hit).length;this.status.textContent=`맞춘 별빛 ${this.hits} / ${this.pattern.notes.length}`;}
  if(this.disc){this.disc.style.transform=`rotate(${pinRotation(this.startData.difficulty,elapsed-this.roundStarted)}rad)`;this.status.textContent=`${this.round+1} / 3 라운드 · 핀 ${this.pins.length} / ${this.pinTarget} · 실수 ${this.mistakes} / 3`;}
  if(left===0)this.finish(this.pattern?'COMPLETE':'TIMEOUT');
 }
});
