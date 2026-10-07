// Mechanical export of existing Canon. No new character settings are introduced.
import {readFile,writeFile} from 'node:fs/promises';
const text=await readFile(new URL('../document/03_characters.md',import.meta.url),'utf8');
const blocks=[...text.matchAll(/\* \*\*(남|여): ([^\n]+)\*\*\r?\n([\s\S]*?)(?=\r?\n\* \*\*|\r?\n####|\r?\n###|\r?\n##|$)/g)];
const chars=blocks.map((m,i)=>{
 const name=m[2].split(' (')[0],age=Number(m[2].match(/(\d+)세/)?.[1]);
 const field=label=>m[3].match(new RegExp('\\* \\*\\*'+label+'\\*\\*: ([^\\r\\n]+)'))?.[1]??'';
 return {id:'CH'+String(i+1).padStart(2,'0'),name,gender:m[1]==='남'?'male':'female',age,title:field('칭호'),background:field('가문/배경'),personality:field('성격'),strength:field('장점'),difficulty:field('단점'),quote:field('말투').match(/"([^"]+)"/)?.[1]??'',asset:`assets/CH${String(i+1).padStart(2,'0')}_${name}.png`,playable:i===0};
});
if(chars.length!==32||chars.some(c=>!c.name||!c.title||!c.quote))throw Error('Incomplete Canon export');
for(const c of chars)c.thumbnail=c.asset.replace(/\.png$/,'_thumb.webp');
Object.assign(chars[0],{personality:'말보다 먼저 주변을 살펴보는 조용한 아이.',strength:'작은 변화도 잘 알아차려요.',difficulty:'계획에 없던 일이 생기면 잠시 고민이 길어져요.',quote:'잠깐. 놓친 게 있을지도 몰라.'});
await writeFile(new URL('../prototype/characters.json',import.meta.url),JSON.stringify(chars,null,2)+'\n');
console.log('Exported 32 existing Canon profiles.');
