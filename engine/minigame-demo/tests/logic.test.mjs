import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/minigames/shared/rng.js';
import { createResultGate } from '../src/minigames/shared/result.js';
import { LEVELS as circuitLevels, buildBoard, connections, rotate } from '../src/minigames/rune-circuit/logic.js';
import { chooseTreasure, hint, investigate } from '../src/minigames/treasure-search/logic.js';
import { makeBoard, canLink, findMove, reshuffleRemaining } from '../src/minigames/rune-link/logic.js';
import { RULES, targetAt, judge, acceptResponse } from '../src/minigames/target-training/logic.js';
import { LEVELS as blockLevels, parseLevel, move, solved } from '../src/minigames/rune-block-push/logic.js';
import { LEVELS as mirrorLevels, reflect, traceBeam } from '../src/minigames/mirror-magic/logic.js';
import { LEVELS as pathLevels, locate, addStep, evaluate } from '../src/minigames/rule-path/logic.js';

test('seeded random and initial boards reproduce exactly', () => {
  const a=makeRng('one'), b=makeRng('one');
  assert.deepEqual([a(),a(),a()],[b(),b(),b()]);
  assert.deepEqual(buildBoard(1,'a').tiles,buildBoard(1,'a').tiles);
  assert.deepEqual(chooseTreasure('a',1),chooseTreasure('a',1));
  assert.deepEqual(makeBoard('a'),makeBoard('a'));
  assert.deepEqual(targetAt('a',2,4),targetAt('a',2,4));
});
test('result gate emits once with the right event', () => {
  const events=[], gate=createResultGate((name,result)=>events.push([name,result]));
  assert.equal(gate({outcome:'success'}),true);
  assert.equal(gate({outcome:'timeout'}),false);
  assert.equal(events.length,1); assert.equal(events[0][0],'minigame:complete');
  const quit=[]; createResultGate(name=>quit.push(name))({outcome:'quit'});
  assert.deepEqual(quit,['minigame:quit']);
});
test('circuit rotation, boundaries, and authored solutions', () => {
  let mask=3; for(let i=0;i<4;i++) mask=rotate(mask); assert.equal(mask,3);
  for(let n=0;n<circuitLevels.length;n++) {
    const board=buildBoard(n,'test');
    assert.equal(connections({...board,tiles:board.solved}).won,true);
    assert.equal(connections(board).won,false);
  }
  assert.equal(connections({size:2,tiles:[8,2,0,0],start:[0,0],goal:[1,0]}).won,false);
  for(let i=0;i<100;i++) for(let n=0;n<circuitLevels.length;n++) {
    const board=buildBoard(n,`seed-${i}`);
    assert.equal(connections(board).won,false);
    assert.equal(connections({...board,tiles:board.solved}).won,true);
  }
});
test('treasure hints, duplicates, and dig limit', () => {
  assert.deepEqual([hint([1,1],[3,0]).distance,hint([1,1],[3,0]).direction],[3,'북동']);
  let state={treasure:[6,6],visited:[],remaining:1,lastDistance:null,found:false};
  state=investigate(state,[0,0]);
  assert.equal(investigate(state,[0,0]),state);
  assert.equal(investigate(state,[1,0]),state);
  assert.equal(state.remaining,0);
});
test('rune links support zero/two turns, reject blocked or three-turn route, detect deadlock', () => {
  assert.equal(canLink(['A','A',null,null],0,1,2,2),true);
  assert.equal(canLink(['A','X','A',null],0,2,2,2),true); // outside edge
  assert.equal(canLink(['A','B','A','B'],0,2,2,2),true);
  assert.equal(canLink(['A','B','C','D'],0,2,2,2),false);
  const trapped=Array(25).fill('B'); trapped[6]='A'; trapped[18]='A';
  assert.equal(canLink(trapped,6,18,5,5),false);
  [7,12,13].forEach(i=>{trapped[i]=null;}); // forced right→down→right→down: three turns
  assert.equal(canLink(trapped,6,18,5,5),false);
  assert.equal(findMove(['A','B','C','D'],2,2),null);
  const board=makeBoard('link');
  assert.ok(findMove(board));
  assert.ok(findMove(reshuffleRemaining(board,'link',1)));
});
test('target training changes rules and refuses duplicate scoring', () => {
  const blueCircle={color:'blue',shape:'circle'}, redTriangle={color:'red',shape:'triangle'};
  assert.equal(judge(0,blueCircle,'slash'),true);
  assert.equal(judge(1,redTriangle,'none'),true);
  assert.equal(RULES[2].decide({color:'red',shape:'circle'}),'block');
  const first=acceptResponse({responded:false,correct:0,mistakes:0,judged:0},0,blueCircle,'slash');
  assert.equal(acceptResponse(first,0,blueCircle,'slash'),first);
});
test('Sokoban blocks walls, boxes, pull attempts, and all stages are solvable', () => {
  const start=parseLevel(blockLevels[0]);
  assert.equal(move({...start,player:[2,3]},1,0).pushes,1);
  assert.deepEqual(move({...start,player:[2,3]},-1,0).boxes,start.boxes); // moving away never pulls a box
  assert.equal(move({...start,player:[1,1]},-1,0).moves,0);
  const blocked=parseLevel(['#####','#PBB#','#.GG#','#####']);
  assert.equal(move(blocked,1,0),blocked);
  const directions=[[0,-1],[0,1],[-1,0],[1,0]];
  for(const lines of blockLevels) {
    const initial=parseLevel(lines), queue=[initial], seen=new Set(); let possible=false;
    for(let head=0;head<queue.length&&head<20000;head++) {
      const state=queue[head], id=`${state.player}|${[...state.boxes].sort()}`;
      if(seen.has(id))continue; seen.add(id);
      if(solved(state)){possible=true;break;}
      directions.forEach(([dx,dy])=>{const next=move(state,dx,dy);if(next!==state)queue.push(next);});
    }
    assert.equal(possible,true,`unsolvable: ${lines.join('/')}`);
  }
});
test('mirror reflection, blockers, loop termination, and all authored solutions', () => {
  assert.deepEqual(reflect([1,0],'/'),[0,-1]);
  assert.deepEqual(reflect([1,0],'\\'),[0,1]);
  mirrorLevels.forEach(level=>assert.equal(traceBeam(level).success,true));
  const blocked={width:3,height:1,source:[0,0],direction:[1,0],goal:[2,0],mirrors:[],blocks:[[1,0]]};
  assert.equal(traceBeam(blocked).outcome,'block');
  const loop={width:3,height:3,source:[1,1],direction:[1,0],goal:[0,0],mirrors:[[2,1,'\\'],[2,2,'/'],[1,2,'\\'],[1,1,'/']],blocks:[]};
  assert.equal(traceBeam(loop).outcome,'loop');
});
test('rule path adjacency, prerequisites, conditions, and undoable plan', () => {
  const level=pathLevels[0], start=locate(level,'S');
  const path=[start];
  assert.equal(addStep(level,path,[5,3]),path);
  const routes=[
    [[1,1],[2,1],[3,1],[3,2],[3,3],[4,3],[5,3]],
    [[1,1],[2,1],[3,1],[3,2],[3,3],[3,4],[4,4],[5,4],[5,3],[5,2],[5,1],[5,2],[5,3],[5,4],[4,4],[3,4],[2,4],[1,4],[2,4],[3,4],[4,4]],
    [[1,1],[1,2],[1,3],[1,4],[2,4],[3,4],[3,3],[3,2],[4,2],[5,2],[5,3],[5,4],[6,4]],
  ];
  pathLevels.forEach((stage,i)=>assert.equal(evaluate(stage,routes[i]).ok,true,evaluate(stage,routes[i]).reason));
  assert.equal(evaluate(level,[[1,1],[1,2],[1,3],[2,3],[3,3],[4,3],[5,3]]).ok,false);
  assert.match(evaluate(pathLevels[1],[[1,1],[2,1],[3,1],[4,1]]).reason,/같은 색/);
  const noRune=[[1,1],[2,1],[3,1],[3,2],[4,2],[5,2],[5,3],[5,4],[6,4]];
  assert.match(evaluate({...pathLevels[2],colorOverrides:{}},noRune).reason,/별 룬/);
  const longRoute=[...routes[2].slice(0,4),[1,3],[1,4],[1,3],[1,4],...routes[2].slice(4)];
  assert.match(evaluate(pathLevels[2],longRoute).reason,/마력/);
  const extension=addStep(level,path,[2,1]);
  assert.deepEqual(extension.slice(0,-1),path);
});
