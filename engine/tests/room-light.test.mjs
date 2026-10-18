import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomLight} from '../src/core/room-light.mjs';
test('room lighting follows actions, not the clock or save data',()=>{
 const light=createRoomLight();assert.equal(light.time,'day');
 light.event('complete');assert.equal(light.time,'sunset');
 light.event('start');assert.equal(light.time,'day');
 light.event('quit');assert.equal(light.time,'day');
 light.event('complete');light.event('next-day');assert.equal(light.time,'day');
 assert.match(light.background,/myroom2_day/);
});
