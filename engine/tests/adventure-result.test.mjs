import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureResultUI} from '../src/ui/adventure-result.mjs';

function node(tag,text='',className=''){
 return {tag,text,className,children:[],attributes:{},removed:false,append(...children){this.children.push(...children);},setAttribute(k,v){this.attributes[k]=v;},addEventListener(){},showModal(){this.open=true;},remove(){this.removed=true;},get textContent(){return [this.text,...this.children.map(c=>c.textContent)].join(' ');},set textContent(value){this.text=value;this.children=[];}};
}
const findButton=n=>n.tag==='button'?n:n.children.map(findButton).find(Boolean);
const findProgress=n=>n.tag==='progress'?n:n.children.map(findProgress).find(Boolean);
function animationClock(t){
 const previousRequest=globalThis.requestAnimationFrame,previousCancel=globalThis.cancelAnimationFrame,frames=new Map();let id=0;
 t.mock.method(performance,'now',()=>0);
 globalThis.requestAnimationFrame=callback=>{frames.set(++id,callback);return id;};globalThis.cancelAnimationFrame=key=>frames.delete(key);
 t.after(()=>{globalThis.requestAnimationFrame=previousRequest;globalThis.cancelAnimationFrame=previousCancel;});
 return time=>{const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(time));};
}
test('investigation fills its bar and waits for a completed result and confirmation',t=>{
 const advance=animationClock(t),host=node('main'),ui=createAdventureResultUI({el:node});let continued=0;
 ui.showInvestigation(host,{durationMs:1500},()=>continued++);
 const overlay=host.children[0],bar=findProgress(host),button=findButton(host);
 assert.equal(button.disabled,true);button.onclick();assert.equal(continued,0);
 advance(750);assert.equal(bar.value,0.5);advance(1600);assert.equal(bar.value,1);
 assert.equal(button.disabled,true);assert.equal(overlay.removed,false);
 ui.finishInvestigation({foundId:'one',foundCount:1,objectiveCount:2});
 assert.equal(button.disabled,false);assert.match(host.textContent,/1 \/ 2/);assert.equal(continued,0);
 advance(60000);assert.equal(overlay.removed,false);button.onclick();button.onclick();
 assert.equal(continued,1);assert.equal(overlay.removed,true);
});

test('found clue shows the exact received image and name and still waits for confirmation',t=>{
 animationClock(t);const host=node('main'),ui=createAdventureResultUI({el:node});let continued=0;
 ui.showInvestigation(host,{durationMs:1500},()=>continued++);
 ui.finishInvestigation({foundId:'ADV_GH_04',item:{name:'꽃잎 표본 카드',imageSrc:'./design-assets/item/adventure/ADV_GH_04.png'},foundCount:1,objectiveCount:2});
 const panel=host.children[0].children[0],art=panel.children.find(child=>child.className==='adventure-found-art');
 assert.equal(panel.attributes['data-has-clue'],'true');assert.equal(art.hidden,false);
 assert.equal(art.src,'./design-assets/item/adventure/ADV_GH_04.png');assert.equal(art.alt,'꽃잎 표본 카드');
 assert.equal(continued,0);findButton(host).onclick();assert.equal(continued,1);
});
test('investigation displays a missed-object hint and screen cleanup cannot advance it',t=>{
 const advance=animationClock(t),host=node('main'),ui=createAdventureResultUI({el:node});let continued=0;
 ui.showInvestigation(host,{durationMs:1000},()=>continued++);
 ui.finishInvestigation({hint:'오른쪽을 더 찾아보자.',foundCount:0,objectiveCount:1});
 assert.match(host.textContent,/오른쪽을 더 찾아보자/);
 const button=findButton(host);ui.clear();advance(2000);button.onclick();assert.equal(continued,0);
});
test('the final discovery waits for confirmation and then starts result processing once',()=>{
 const host=node('main'),ui=createAdventureResultUI({el:node});let continued=0;
 ui.showFound(host,{foundCount:3,objectiveCount:3},()=>continued++);
 assert.match(host.textContent,/목표를 모두 찾았어요!/);
 const button=findButton(host);assert.equal(button.text,'결과 확인하기');assert.notEqual(button.disabled,true);assert.equal(continued,0);
 button.onclick();assert.equal(continued,1);assert.equal(host.children[0].removed,true);button.onclick();assert.equal(continued,1);
});
test('mission success waits indefinitely for the confirmation button and advances only once',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const host=node('main'),ui=createAdventureResultUI({el:node});let continued=0;
 ui.show(host,{outcome:'MISSION_COMPLETE',foundCount:2,objectiveCount:2,feedback:'탐험 +8'},()=>continued++);
 assert.match(host.textContent,/모험 성공!/);assert.match(host.textContent,/2 \/ 2/);assert.match(host.textContent,/탐험 \+8/);
 assert.equal(continued,0);t.mock.timers.tick(60000);assert.equal(continued,0);assert.equal(host.children[0].removed,false);
 const button=findButton(host);assert.equal(button.text,'다음으로');button.onclick();assert.equal(continued,1);assert.equal(host.children[0].removed,true);button.onclick();assert.equal(continued,1);
});
test('changing screens cancels result navigation and timeout uses its own result message',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const host=node('main'),ui=createAdventureResultUI({el:node});let continued=0;
 ui.show(host,{outcome:'TIMEOUT',foundCount:1,objectiveCount:3,feedback:'탐험 +1'},()=>continued++);
 assert.match(host.textContent,/시간이 다 되었어요/);assert.doesNotMatch(host.textContent,/모험 성공/);
 const button=findButton(host);ui.clear();button.onclick();t.mock.timers.tick(3000);assert.equal(continued,0);assert.equal(host.children[0].removed,true);
});
