import {CLASSES} from '../core/classes.mjs';
import {curriculumResult} from '../core/curriculum.mjs';
import {circuitStage,mirrorStage,potStage,pourPot,potsSolved,shelfStage,moveShelf,shelvesSolved,rhythmPattern,pinRotation,firePin} from '../core/curriculum-puzzles.mjs';
import {rotate,connections} from '../../minigame-demo/src/minigames/rune-circuit/logic.js';
import {traceBeam} from '../../minigame-demo/src/minigames/mirror-magic/logic.js';

const ART={observatory:'BG06_starlight_observatory_1920x1080_015.png',plaza:'BG02_clocktower_plaza_1920x1080_011.png',greenhouse:'BG07_glass_greenhouse_1920x1080_016.png',library:'BG05_grand_library_1920x1080_014.png',workshop:'BG09_magic_workshop_1920x1080_018.png',training:'BG10_rune_training_ground_1920x1080_019.png'};
const COLORS=['#de8b82','#8ca97f','#8da8c0','#c5a15f','#aa90bd','#81b7ac'];
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined&&text!==null)node.textContent=text;if(cls)node.className=cls;return node;}
function button(text,action){const node=el('button',text);node.type='button';node.onclick=action;return node;}
export const curriculumScenes=CLASSES.map(lesson=>class extends Phaser.Scene{
 constructor(){super(lesson.sceneKey);this.gameId=lesson.id;}
 init(data){this.startData=data;this.round=0;this.moves=0;this.mistakes=0;this.hits=0;this.extras=0;this.greatLimit=0;this.done=false;this.pausedMs=0;this.selected=null;this.history=[];this.inputLog=[];this.pattern=null;this.disc=null;this.solved=false;this.roundStarted=0;}
 create(){
  this.startedAt=performance.now();this.root=el('section',null,'curriculum-game');this.root.style.backgroundImage=`linear-gradient(#203126bb,#203126bb),url('./world-assets/${ART[lesson.locationId]}')`;
  const header=el('header',null,'paper curriculum-header');this.timer=el('span','');header.append(el('h1',lesson.title),this.timer,button('포기하기',()=>this.quit()));
  this.instruction=el('p','', 'curriculum-instruction');this.board=el('div',null,'paper curriculum-board');this.status=el('p','', 'curriculum-status');
  this.root.append(header,this.instruction,this.board,this.status);document.querySelector('#game').append(this.root);
  this.events.once('shutdown',()=>{this.done=true;this.root?.remove();});
  if(this.startData.assistLevel)this.status.textContent='조금 더 쉬운 연습으로 준비했어.';
  this.loadRound();
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
   let text='',disabled=false,index=y*width+x;
   if(mirror){index=p.level.mirrors.findIndex(([mx,my])=>mx===x&&my===y);text=index>=0?p.orientations[index]:p.level.source[0]===x&&p.level.source[1]===y?'✦':p.level.blocks.some(([bx,by])=>bx===x&&by===y)?'■':[[...(p.level.goal??[])],[...(p.level.secondaryGoal??[])]].some(([gx,gy])=>gx===x&&gy===y)?'◎':p.level.rune?.[0]===x&&p.level.rune?.[1]===y?'◆':'·';disabled=index<0;}
   else{text=['·','╵','╶','└','╷','│','┌','├','╴','┘','─','┴','┐','┤','┬','┼'][p.tiles[index]];disabled=[p.start,p.goal,p.branchGoal,...p.fixed].filter(Boolean).some(([px,py])=>px===x&&py===y);}
   const b=button(text,()=>{if(this.done)return;if(mirror){p.orientations[index]=p.orientations[index]==='/'?'\\':'/';this.logInput('TOGGLE',{mirrorIndex:index});}else{p.tiles[index]=rotate(p.tiles[index]);this.logInput('ROTATE',{cellIndex:index});}this.moves++;const won=mirror?traceBeam(p.level,p.orientations).success:connections(p).won;if(won)this.completeRound();else this.drawPuzzle();});b.disabled=disabled;b.classList.toggle('lit',path.has(mirror?x+','+y:index));
   const point=coord=>coord?.[0]===x&&coord?.[1]===y;
   const marker=mirror?(point(p.level.prism)?'분기':point(p.level.rune)?'필수 룬':point(p.level.source)?'광원':point(p.level.goal)||point(p.level.secondaryGoal)?'목표':null):(point(p.start)?'광원':point(p.goal)||point(p.branchGoal)?'목표':point(p.mandatory)?'필수 룬':null);
   if(marker){b.append(el('small',marker,'course-cell-label'));b.setAttribute('aria-label',marker+' · '+text);}grid.append(b);
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
