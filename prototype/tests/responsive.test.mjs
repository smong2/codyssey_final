import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderStory} from '../story-view.mjs';
import {freshState} from '../state.mjs';
const c=JSON.parse(readFileSync(new URL('../content.json',import.meta.url)));
const chars=JSON.parse(readFileSync(new URL('../characters.json',import.meta.url)));
test('Intro exposes inline muted video and Skip',()=>{
 const s=freshState();s.scene='awakening';
 const html=renderStory(s,c,chars);
 assert.match(html,/<video/);assert.match(html,/playsinline/);assert.match(html,/muted/);assert.match(html,/skip-intro/);
});
test('Admission displays supplied invitation with personalized text',()=>{
 const s=freshState();s.scene='admission';s.selectedCharacterName='카엘';
 const html=renderStory(s,c,chars);
 assert.match(html,/data-asset="invitation"/);assert.match(html,/카엘에게/);assert.match(html,/입학하기/);
});
test('dialogue advances from panel while Choice has no progression arrow',()=>{
 const s=freshState();s.scene='sion';
 const html=renderStory(s,c,chars);
 assert.match(html,/data-action="next"/);assert.match(html,/progress-arrow/);assert.doesNotMatch(html,/>계속<\/button>/);
 s.scene='choice';const choice=renderStory(s,c,chars);
 assert.match(choice,/safe-choices/);assert.doesNotMatch(choice,/progress-arrow/);
});
test('card enlargement lives inside each card without selecting it',()=>{
 const s=freshState();s.scene='select';const html=renderStory(s,c,chars,{selected:'CH01',gender:'male'});
 assert.equal((html.match(/data-action="enlarge"/g)||[]).length,16);
 assert.match(html,/card-background/);assert.match(html,/data-action="card"/);
});
test('story feedback keeps named actions instead of repeated Continue buttons',()=>{
 for(const scene of ['room','diarySaved','reward','heartIntro']){const s=freshState();s.scene=scene;assert.doesNotMatch(renderStory(s,c,chars),/>계속<\/button>/);}
});
