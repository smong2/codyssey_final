export function endingNode(tag,text='',className=''){
 const value={tag,text:text??'',className:className??'',children:[],attributes:{},style:{setProperty(key,value){this[key]=value;}},disabled:false,parentNode:null,
  get isConnected(){return this.root===true||Boolean(this.parentNode?.isConnected);},
  append(...items){for(const item of items.filter(Boolean)){item.remove();item.parentNode=this;this.children.push(item);}},
  replaceChildren(...items){for(const item of this.children)item.parentNode=null;this.children=[];this.append(...items);},
  remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(item=>item!==this);this.parentNode=null;}},
  setAttribute(key,value){this.attributes[key]=String(value);},
  get textContent(){return [this.text,...this.children.map(item=>item.textContent)].join(' ');},
  querySelectorAll(selector){return endingNodes(this).slice(1).filter(item=>selector.startsWith('.')?item.className.split(' ').includes(selector.slice(1)):item.tag===selector);},
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 };
 value.classList={contains:name=>value.className.split(' ').includes(name),add(...names){value.className=[...new Set([...value.className.split(' '),...names])].join(' ');},remove(...names){value.className=value.className.split(' ').filter(name=>!names.includes(name)).join(' ');}};
 return value;
}
export const endingNodes=node=>[node,...node.children.flatMap(endingNodes)];
export const settleEnding=()=>new Promise(resolve=>setImmediate(resolve));
