import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROOM_BUTTON_ART,TITLE_BUTTON_ART,createImageButton,createBagButton} from '../src/ui/button-art.mjs';

function node(tag,text='',className=''){
 const item={tag,text,className,children:[],attributes:{},style:{},append(...items){this.children.push(...items);},setAttribute(key,value){this.attributes[key]=value;}};
 return item;
}

test('maps title and room controls to the approved button artwork',()=>{
 assert.deepEqual(TITLE_BUTTON_ART,{start:'BT04_blank_pale_green.png',newGame:'BT04_blank_pale_green.png',continue:'BT04_blank_pale_green.png'});
 assert.deepEqual(ROOM_BUTTON_ART,{diary:'BT01_diary_green.png',bag:'BT02_backpack_green.png',menu:'BT03_menu_green.png'});
});

test('creates an accessible image button without changing its click handler',()=>{
 let clicks=0;const action=()=>clicks++;
 const control=createImageButton({el:node,btn:(text,onclick,className)=>Object.assign(node('button',text,className),{onclick}),src:'./design-assets/ui/BT05_start_game.png',label:'시작하기',onClick:action,className:'title-image-button'});
 assert.equal(control.attributes['aria-label'],'시작하기');
 assert.equal(control.children[0].tag,'img');
 assert.equal(control.children[0].src,'./design-assets/ui/BT05_start_game.png');
 assert.equal(control.children[0].attributes['aria-hidden'],'true');
 control.onclick();assert.equal(clicks,1);
});

test('supports a visible caption over the BT04 button art',()=>{
 const control=createImageButton({el:node,btn:(text,onclick,className)=>Object.assign(node('button',text,className),{onclick:()=>{}}),src:'./design-assets/ui/BT04_blank_pale_green.png',label:'새로 시작하기',caption:'새로 시작하기',className:'title-image-button'});
 assert.equal(control.children[0].src,'./design-assets/ui/BT04_blank_pale_green.png');
 assert.equal(control.children[1].text,'새로 시작하기');
});

test('bag controls use ivory by default and green for the selected state with matching native ratios',()=>{
 const btn=(text,onclick,className)=>Object.assign(node('button',text,className),{onclick});
 for(const selected of [false,true]){
  const control=createBagButton({el:node,btn,label:'배지',onClick(){},selected});
  const file=`BT04_blank_pale_${selected?'green':'ivory'}_short.png`;
  assert.ok(control.style.backgroundImage.includes(file));assert.equal(control.attributes['aria-pressed'],String(selected));
  const png=readFileSync(new URL('../../asset/ui/'+file,import.meta.url));
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[1362,311]);
 }
});

test('keeps title buttons 20 percent larger with half-height spacing and scales room icons responsively',()=>{
 const css=readFileSync(new URL('../preview.css',import.meta.url),'utf8');
 assert.match(css,/--title-button-width:min\(360px,37\.2vh,96vw\)/);
 assert.match(css,/title-actions \.title-image-button\{position:relative;box-sizing:border-box;width:100%;aspect-ratio:1940\/311\}/);
 assert.match(css,/title-actions \.title-image-button \.button-art\{width:100%;height:100%;object-fit:contain\}/);
 assert.match(css,/title-image-button\+\.title-image-button\{margin-top:clamp\(6px,3vh,29px\)/);
 assert.match(css,/room-iconbar\{gap:clamp\(2px,\.5vw,6px\)\}/);
 assert.match(css,/room-icon\.room-image-button\{box-sizing:border-box;width:clamp\(39\.6px,7\.92vw,100\.8px\);height:clamp\(39\.6px,7\.92vw,100\.8px\)/);
 assert.match(css,/room-image-button \.button-art\{width:100%;height:100%;object-fit:contain\}/);
});
