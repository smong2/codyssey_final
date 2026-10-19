import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDialogueUI} from '../src/ui/dialogue.mjs';

function node(tag,text='',className=''){
 const item={tag,text,className,src:'',alt:'',style:{},hidden:false,children:[],append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},remove(){},setAttribute(){},addEventListener(){},get textContent(){return [this.text,...this.children.map(child=>child.textContent)].filter(Boolean).join(' ');}};
 item.classList={toggle(name,enabled){const names=new Set(item.className.split(/\s+/).filter(Boolean));if(enabled)names.add(name);else names.delete(name);item.className=[...names].join(' ');}};
 return item;
}
const all=item=>[item,...item.children.flatMap(all)];
const button=(text,onclick,className='')=>Object.assign(node('button',text,className),{onclick});

test('choice question remains in the bottom dialogue frame while choice buttons live beside the character',()=>{
 const shell=node('main');
 const ui=createDialogueUI({el:node,btn:button,shell,heading(_title,className){shell.className=className;shell.replaceChildren(node('h1'));},modal(){}});
 ui.render({payload:{schemaVersion:1,dialogueId:'choice-layout',storyId:'S',eventId:'E',dialogueToken:'token',canSkip:false,speakers:{GUIDE:{kind:'CHARACTER',id:'CH16',name:'티아'}},sequence:[
  {type:'IMAGE',target:'FOCUS',action:'SHOW',assetType:'CHARACTER',src:'/guide.png',alt:'티아'},
  {type:'CHOICE',choiceNodeId:'C1',prompt:'어떤 길을 고를까?',options:[{choiceId:'A',text:'왼쪽 길',reaction:[]},{choiceId:'B',text:'오른쪽 길',reaction:[]}]},
  {type:'END'}
 ]}});
 const frame=all(shell).find(item=>item.className.includes('life-dialogue'));
 const layer=all(shell).find(item=>item.className.includes('dialogue-choice-layer'));
 const panel=all(shell).find(item=>item.className.includes('dialogue-choice-panel-right'));
 assert.ok(frame&&layer&&panel);assert.equal(layer.hidden,false);
 assert.match(frame.textContent,/어떤 길을 고를까/);assert.equal(frame.children.includes(panel),false);assert.equal(layer.children.includes(panel),true);
 const buttons=panel.children.filter(item=>item.tag==='button');assert.equal(buttons.length,2);
 assert.ok(buttons.every(item=>item.style.backgroundImage==='url("./design-assets/ui/BT04_choice_blank_pale_ivory.png")'));
 const css=readFileSync(new URL('../preview.css',import.meta.url),'utf8'),rule=css.match(/\.dialogue-choice-layer\{([^}]*)\}/)?.[1]??'';
 assert.match(rule,/position:absolute/);assert.match(rule,/right:/);assert.match(rule,/width:min\(42vw,620px\)/);
});
