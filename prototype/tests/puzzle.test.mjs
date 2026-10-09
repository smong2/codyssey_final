import test from 'node:test';
import assert from 'node:assert/strict';
import {ports,reachable,initialPuzzle,connected,rotate} from '../puzzle.mjs';
test('한 칸을 네 번 돌리면 원래 홈으로 돌아온다',()=>{for(const mask of [2,3,6,9,10,12])assert.equal(ports(mask,4),mask);});
test('보드의 오른쪽 끝과 다음 줄 왼쪽 끝을 연결하지 않는다',()=>{const p=initialPuzzle();p.masks=[2,10,10,8,0,0,0,0,8];p.rotations=Array(9).fill(0);assert.deepEqual([...reachable(p)],[0,1,2]);assert.equal(connected(p),false);});
test('시작·도착은 회전할 수 없으며 약초/Knowledge 없이 해결 판정한다',()=>{const p=initialPuzzle();rotate(p,0);rotate(p,8);assert.equal(p.rotations[0],0);assert.equal(p.rotations[8],0);p.rotations=p.solution.slice();assert.equal(connected(p),true);});
