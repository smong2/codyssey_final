import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('fairy trade renders as its own dormitory scene with the approved fairy asset',()=>{
 const source=readFileSync(new URL('../src/preview-main.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../preview.css',import.meta.url),'utf8');
 assert.match(source,/function renderFairyTrade\(checkpoint\)/);
 assert.match(source,/CH_DRM_fairy_trade_upperbody_01\.png/);
 assert.doesNotMatch(source,/modal\("요정의 거래"/);
 assert.match(css,/fairy-trade-page[^\n]*BG03_academy_dormitory_1920x1080_013\.png/);
});

test('forced rest explains the cancelled schedule and three-day recovery before continuing',()=>{
 const source=readFileSync(new URL('../src/preview-main.mjs',import.meta.url),'utf8');
 assert.match(source,/너무 무리한 것 같다\. 체력 관리해야지\./);
 assert.match(source,/오늘 예정된 일정은 취소되고, 오늘부터 3일 동안 강제로 쉽니다\./);
 assert.match(source,/세 번째 휴식이 끝나면 체력이 100으로 회복됩니다\./);
});

test('adventure investigation no longer waits one to two seconds before reporting a find',()=>{
 const source=readFileSync(new URL('../src/scenes/AdventureScene.mjs',import.meta.url),'utf8');
 assert.match(source,/const delay=120;/);
 assert.doesNotMatch(source,/1000\+Math\.random\(\)\*1000/);
});
