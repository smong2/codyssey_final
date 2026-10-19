import test from 'node:test';
import assert from 'node:assert/strict';
import {createActivityResultUI} from '../src/ui/activity-result.mjs';

function node(tag,text='',className=''){
 const item={tag,text,className,children:[],disabled:false,open:false,append(...items){this.children.push(...items);},remove(){this.removed=true;},setAttribute(){},addEventListener(){},showModal(){this.open=true;},focus(){this.focused=true;},get textContent(){return [this.text,...this.children.map(child=>child.textContent)].filter(Boolean).join(' ');}};
 return item;
}
const all=item=>[item,...item.children.flatMap(all)];
const button=(text,onclick,className='')=>Object.assign(node('button',text,className),{onclick});

test('activity result uses a centered modal and waits for explicit continuation',()=>{
 const host=node('main');let continued=0;
 const ui=createActivityResultUI({el:node,btn:button});
 ui.show(host,{title:'활동 결과',message:'수업을 마쳤어요.',details:['마법 +5','체력 -10 (80/100)']},()=>continued++);
 const dialog=all(host).find(item=>item.tag==='dialog');
 assert.ok(dialog);assert.match(dialog.className,/adventure-result-overlay/);assert.equal(dialog.open,true);
 assert.match(host.textContent,/마법 \+5/);assert.match(host.textContent,/체력 -10/);assert.equal(continued,0);
 all(host).find(item=>item.tag==='button'&&item.text==='다음으로').onclick();
 assert.equal(continued,1);assert.equal(dialog.removed,true);
});

test('forced-rest style notice can provide custom copy and action label',()=>{
 const host=node('main');let continued=0;
 const ui=createActivityResultUI({el:node,btn:button});
 ui.show(host,{title:'강제 휴식',message:'너무 무리한 것 같다. 체력 관리해야지.',details:['오늘부터 3일 동안 강제로 쉽니다.'],buttonLabel:'휴식 시작',symbol:'☾'},()=>continued++);
 assert.match(host.textContent,/너무 무리한 것 같다/);assert.match(host.textContent,/3일 동안 강제로 쉽니다/);
 all(host).find(item=>item.tag==='button'&&item.text==='휴식 시작').onclick();assert.equal(continued,1);
});
