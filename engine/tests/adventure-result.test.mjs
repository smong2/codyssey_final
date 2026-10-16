import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureResultUI} from '../src/ui/adventure-result.mjs';

function node(tag,text='',className=''){
 return {tag,text,className,children:[],attributes:{},removed:false,append(...children){this.children.push(...children);},setAttribute(k,v){this.attributes[k]=v;},addEventListener(){},showModal(){this.open=true;},remove(){this.removed=true;},get textContent(){return [this.text,...this.children.map(c=>c.textContent)].join(' ');}};
}
const findButton=n=>n.tag==='button'?n:n.children.map(findButton).find(Boolean);
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
