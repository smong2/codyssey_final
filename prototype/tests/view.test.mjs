import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshState} from '../state.mjs';
const viewURL=new URL('../story-view.mjs',import.meta.url);
const fixtures=async()=>({c:JSON.parse(await readFile(new URL('../content.json',import.meta.url))),chars:JSON.parse(await readFile(new URL('../characters.json',import.meta.url)))});
test('intro-only autosave does not masquerade as a playable Continue slot',async()=>{
 const {renderStory}=await import(viewURL);const {c,chars}=await fixtures();const s=freshState();s.scene='title';
 const html=renderStory(s,c,chars,{saved:{...freshState(),scene:'reveal'}});assert.ok(html.includes('이야기를 시작합니다'));assert.ok(!html.includes('data-action="continue"'));
});
test('Life retains player left and NPC right when either speaks',async()=>{
 const {renderStory}=await import(viewURL);const {c,chars}=await fixtures();const s=freshState();s.scene='valentinus';
 for(const node of [0,1]){s.node=node;const html=renderStory(s,c,chars,{});assert.ok(html.includes('portrait-left'));assert.ok(html.includes('portrait-right'));assert.equal((html.match(/class="life-dialogue"/g)||[]).length,1);}
});
test('non-playable character detail offers enlargement but no start or restriction notice',async()=>{
 const {renderStory}=await import(viewURL);const {c,chars}=await fixtures();const s=freshState();s.scene='select';
 let html=renderStory(s,c,chars,{selected:'CH02',gender:'female'});assert.ok(html.includes('이미지 크게 보기'));assert.ok(!html.includes('data-action="confirm-character"'));assert.ok(!html.includes('카엘로만'));
 html=renderStory(s,c,chars,{selected:'CH01',gender:'male'});assert.ok(html.includes('data-action="confirm-character"'));
});
test('choice reaction first shows player actual words',async()=>{
 const {renderStory}=await import(viewURL);const {c,chars}=await fixtures();const s=freshState();s.scene='choiceReaction';s.choice='time';
 const html=renderStory(s,c,chars,{});assert.ok(html.includes('천천히 생각해 봐. 내가 옆에 있을게.'));assert.ok(html.includes('portrait-left speaking'));
});
test('free room has safe ending tools but morning does not expose an exit or second episode',async()=>{
 const {renderStory}=await import(viewURL);const {c,chars}=await fixtures();const s=freshState();s.scene='roomFree';s.heartBalance=100;s.dayEndUnlocked=true;
 const evening=renderStory(s,c,chars,{});assert.ok(evening.includes('베른과 이야기하기'));assert.ok(evening.includes('오늘을 마무리하기'));assert.ok(evening.includes('♥ 100'));assert.ok(!evening.includes('리포트'));
 s.scene='morning';s.timeOfDay='morning';const morning=renderStory(s,c,chars,{});assert.ok(morning.includes('다이어리'));assert.ok(!morning.includes('오늘을 마무리하기'));assert.ok(!morning.includes('방 나가기'));assert.ok(!morning.includes('EPISODE 2'));
});
test('returning to recovered greenhouse never replays wilted-flower observations',async()=>{
 const {renderStory}=await import(viewURL);const {c,chars}=await fixtures();const s=freshState();s.scene='greenhouse';s.restored=true;
 for(let node=0;node<5;node++){s.node=node;const html=renderStory(s,c,chars,{});assert.ok(!html.includes('정말 빛이 거의 없네.'));assert.ok(!html.includes('원래는 훨씬 밝게 빛나.'));}
});
