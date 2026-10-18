import test from 'node:test';
import assert from 'node:assert/strict';
import {BADGE_GROUPS,badgeProgress,ROOM_BACKGROUNDS,roomProgress,activeRoom,roomPieceImage} from '../src/core/collection-view.mjs';
import {access} from 'node:fs/promises';
import {renderBadgePanel,renderRoomPanel} from '../src/ui/collection-panels.mjs';
import {createJournalUI} from '../src/ui/journal.mjs';
import {createProfile,startRun} from '../src/core/state.mjs';
import {studentCards} from '../src/core/catalogue.mjs';
import {createLocalRepository} from '../src/core/storage.mjs';
test('badge frames expose 200 conditions without substituting legacy counters for missing badge progress',()=>{
 assert.equal(BADGE_GROUPS.length,5);assert.equal(BADGE_GROUPS.flatMap(g=>g.subgroups).reduce((sum,s)=>sum+s.thresholds.length,0),200);
 const meta={badges:[],counters:{adventures:200},hiddenStats:{curiosity:100}},group=BADGE_GROUPS[0],sub=group.subgroups[0];
 const result=badgeProgress(meta,group,sub);assert.equal(result.current,null);assert.deepEqual(result.earned,[]);
 assert.equal(badgeProgress(meta,group,group.subgroups[3]).current,null);
});

test('only received badge progress is displayed while unrelated old cumulative values remain untouched',()=>{
 const meta={badges:[],counters:{adventures:12},collectionView:{badges:[{categoryId:'forest',subcategoryTitle:'오늘도 탐험!',current:0,earnedTiers:[]}]}},before=structuredClone(meta),group=BADGE_GROUPS[0];
 assert.equal(badgeProgress(meta,group,group.subgroups[0]).current,0);
 delete meta.collectionView.badges[0].current;
 assert.equal(badgeProgress(meta,group,group.subgroups[0]).current,null);
 const panel=element('section');renderBadgePanel(panel,{el:element,btn:button,meta:()=>meta});
 const hint=all(panel).find(node=>node.className==='collection-next-badge');
 assert.match(hint.textContent,/진행 기록을 기다리고/);assert.doesNotMatch(hint.textContent,/현재 12/);
 assert.equal(meta.counters.adventures,before.counters.adventures);
});
test('room art is mapped without unlocking rooms and legacy overrides preserve independently saved runs',()=>{
 assert.equal(ROOM_BACKGROUNDS.length,4);const p=createProfile();startRun(p,1,'CH01');
 assert.equal(roomProgress(p.meta,'room-1').unlocked,false);assert.equal(roomProgress(p.meta,'room-1').images.day,'BG11_myroom4_cosmos_day.png');
 p.meta.collectionView={rooms:[{id:'room-1',pieces:[0,3,4],unlocked:true,images:{day:'BG03_myroom1_day_1920x1080_012.png'}}]};
 let raw;const repository=createLocalRepository({getItem:()=>raw,setItem:(_key,value)=>raw=value});repository.save(p);p.slots[0].activeRun.stats.magic=300;
 repository.saveSettings({activeRoomBackgroundId:'room-1'});const restored=repository.load();assert.equal(restored.slots[0].activeRun.stats.magic,50);assert.equal(activeRoom(restored).image,'BG03_myroom1_day_1920x1080_012.png');assert.equal(activeRoom(restored,'night').image,'BG03_myroom1_day_1920x1080_012.png');assert.throws(()=>repository.saveSettings({activeRoomBackgroundId:'room-2'}));
});

function element(tag,text='',className=''){
 return {tag,text,className,children:[],attributes:{},style:{},append(...items){this.children.push(...items.filter(Boolean));},replaceChildren(...items){this.children=items;},setAttribute(key,value){this.attributes[key]=value;},querySelector(selector){return selector==='h1'?this.children.find(item=>item.tag==='h1'):null;},get textContent(){return [this.text,...this.children.map(item=>item.textContent)].join(' ');}};
}
const button=(text,onclick,className='')=>Object.assign(element('button',text,className),{onclick});
const all=node=>[node,...node.children.flatMap(all)];

test('bag opens badges first and changes tabs in the approved order without changing the profile',()=>{
 const profile=createProfile();delete profile.settings; // Legacy saves may not contain room preferences.
 const before=structuredClone(profile),shell=element('main');
 const journal=createJournalUI({el:element,btn:button,shell,heading:()=>shell.replaceChildren(element('h1','가방')),meta:()=>profile.meta,settings:()=>profile.settings,current:()=>null,onReturn(){},activePet:()=>({id:'PET01'})});
 journal.bag();let tabs=all(shell).find(node=>node.className.includes('bag-tabs'));
 assert.deepEqual(tabs.children.map(node=>node.text),['배지','펫','캐릭터','마이룸']);
 assert.equal(tabs.children[0].attributes['aria-pressed'],'true');
 tabs.children[3].onclick();tabs=all(shell).find(node=>node.className.includes('bag-tabs'));
 assert.match(tabs.children[3].className,/is-selected/);
 assert.equal(tabs.children[3].style.backgroundImage,undefined);
 assert.match(shell.textContent,/기본 기숙사방/);
 assert.equal(all(shell).filter(node=>node.className.includes('room-card-trigger')).length,4);
 assert.equal(all(shell).some(node=>node.tag==='button'&&/퍼즐 보기|사용 중/.test(node.text)),false);
 assert.ok(all(shell).some(node=>node.attributes['aria-label']==='현재 사용 중인 배경'));
 assert.deepEqual(profile,before);
});

test('all three room themes provide day, sunset, night and twelve exact-position piece assets',async()=>{
 const meta={collectionView:{rooms:ROOM_BACKGROUNDS.slice(1).map(room=>({id:room.id,pieces:Array.from({length:12},(_,index)=>index),unlocked:true}))}};
 for(const room of ROOM_BACKGROUNDS.slice(1)){
  const state=roomProgress(meta,room.id);
  for(const time of ['day','sunset','night'])await access(new URL('../../asset/background/'+state.images[time],import.meta.url));
  for(let index=0;index<12;index++)await access(new URL('../../asset/puzzle/'+roomPieceImage(state,index).split('/').at(-1),import.meta.url));
 }
 const locked=roomProgress({collectionView:{rooms:[{id:'room-1',pieces:[0,3],unlocked:false}]}},'room-1');
 assert.ok(roomPieceImage(locked,3).endsWith('_04.png'));assert.equal(roomPieceImage(locked,1),null);
});

test('badges show only received award layers, next conditions and automatic reward status',()=>{
 const meta={badges:[],counters:{adventures:7},collectionView:{badges:[{categoryId:'forest',subcategoryTitle:'오늘도 탐험!',current:7,earnedTiers:[1,2],awardedMilestones:[2]}]}},before=structuredClone(meta),panel=element('section');
 renderBadgePanel(panel,{el:element,btn:button,meta:()=>meta});
 const tiers=all(panel).filter(node=>node.className.includes('badge-tier'));
 assert.equal(tiers.length,8);
 assert.equal(all(tiers[0]).filter(node=>node.tag==='img').length,3);
 assert.equal(all(tiers[2]).filter(node=>node.tag==='img').length,1);
 assert.ok(all(tiers[2]).find(node=>node.src?.endsWith('badge_state_locked_038.png')));
 const hint=all(panel).find(node=>node.className==='collection-next-badge');assert.match(hint.textContent,/모험 10번/);assert.match(hint.textContent,/7 \/ 10/);
 assert.match(panel.textContent,/지급 완료/);assert.match(panel.textContent,/다음 회차/);
 assert.equal(all(panel).some(node=>node.tag==='button'&&/받기|수령/.test(node.text)),false);
 assert.deepEqual(meta,before);
});

test('badge categories stay in a text-only sidebar while only one of five subgroups expands',()=>{
 const meta={badges:[],counters:{}},panel=element('section');
 renderBadgePanel(panel,{el:element,btn:button,meta:()=>meta});
 const sidebar=all(panel).find(node=>node.className==='badge-category-list');
 assert.ok(sidebar);assert.equal(sidebar.children.length,5);
 assert.equal(all(sidebar).filter(node=>node.tag==='img').length,0);
 const headers=()=>all(panel).filter(node=>node.className==='badge-subgroup-toggle');
 assert.equal(headers().length,5);
 assert.equal(headers().filter(node=>node.attributes['aria-expanded']==='true').length,1);
 headers()[1].onclick();
 assert.equal(headers()[0].attributes['aria-expanded'],'false');
 assert.equal(headers()[1].attributes['aria-expanded'],'true');
 assert.equal(all(panel).filter(node=>node.className.includes('badge-tier')).length,8);
 headers()[1].onclick();assert.equal(all(panel).filter(node=>node.className.includes('badge-tier')).length,0);
 sidebar.children[1].onclick();
 assert.equal(sidebar.children[1].attributes['aria-pressed'],'true');
 assert.match(panel.textContent,/과학은 재미있어!/);
 assert.equal(headers().length,5);
});

test('selecting a locked badge reveals its condition and progress without granting it',()=>{
 const meta={badges:[],counters:{adventures:12},collectionView:{badges:[{categoryId:'forest',subcategoryTitle:'오늘도 탐험!',current:7,earnedTiers:[]}]}},before=structuredClone(meta),panel=element('section');
 renderBadgePanel(panel,{el:element,btn:button,meta:()=>meta});
 const tiles=all(panel).filter(node=>node.className.includes('badge-tier'));
 assert.equal(tiles.length,8);tiles[7].onclick();
 const hint=all(panel).find(node=>node.className==='collection-next-badge');
 assert.match(hint.textContent,/모험 200번/);assert.match(hint.textContent,/7 \/ 200/);
 assert.deepEqual(meta,before);
});

test('room detail reveals owned pieces only and a failed selection can retry without closing the bag',()=>{
 const meta={collectionView:{rooms:[{id:'room-1',pieces:[0,3,4],unlocked:false},{id:'room-2',pieces:Array.from({length:12},(_,index)=>index),unlocked:true}]}},settings={activeRoomBackgroundId:'default'},panel=element('section'),dialogs=[];let attempts=0;
 renderRoomPanel(panel,{el:element,btn:button,meta:()=>meta,settings:()=>settings,modal(title,body){const dialog={title,body,closed:false,close(){this.closed=true;}};dialogs.push(dialog);return dialog;},onSelectRoom(id){if(++attempts===1)return false;settings.activeRoomBackgroundId=id;return true;}});
 const cards=()=>all(panel).filter(node=>node.className.includes('room-card-trigger'));
 cards()[1].onclick();let detail=dialogs.at(-1).body;
 assert.equal(all(detail).filter(node=>node.className==='room-piece').length,12);
 assert.deepEqual(all(detail).filter(node=>node.tag==='img').map(node=>node.src.split('/').at(-1)),['PZ01_우주방_01.png','PZ01_우주방_04.png','PZ01_우주방_05.png']);
 assert.equal(all(detail).some(node=>node.text==='이 배경 사용하기'),false);
 const missing=all(detail).filter(node=>node.className==='room-piece'&&node.attributes['aria-label'].includes('미획득'));
 assert.equal(missing.length,9);assert.ok(missing.every(node=>node.children.length===0&&!node.text));
 cards()[2].onclick();detail=dialogs.at(-1).body;
 assert.equal(attempts,0); // Merely opening a completed room must not apply it.
 all(detail).find(node=>node.text==='이 배경 사용하기').onclick();
 assert.equal(settings.activeRoomBackgroundId,'default');assert.match(detail.textContent,/변경하지 못했어요/);
 all(detail).find(node=>node.text==='다시 시도').onclick();assert.equal(settings.activeRoomBackgroundId,'room-2');
 assert.equal(dialogs.at(-1).closed,false);assert.match(detail.textContent,/현재 사용 중/);
 assert.equal(cards()[2].attributes['aria-pressed'],'true');
 assert.equal(all(panel).some(node=>node.tag==='button'&&node.text==='이 배경 사용하기'),false);
});

test('locked room cards keep monochrome room artwork and a shared lock while opening never changes ownership',()=>{
 const meta={collectionView:{rooms:[{id:'room-1',pieces:[2],unlocked:false}]}},before=structuredClone(meta),panel=element('section'),dialogs=[];
 renderRoomPanel(panel,{el:element,btn:button,meta:()=>meta,settings:()=>undefined,modal:(title,body)=>dialogs.push({title,body})});
 const cards=all(panel).filter(node=>node.className.includes('room-card-trigger'));
 assert.equal(cards.length,4);const locked=cards[1];assert.match(locked.className,/is-locked/);
 assert.ok(all(locked).some(node=>node.className==='room-card-art'&&node.src.endsWith('BG11_myroom4_cosmos_day.png')));
 assert.ok(all(locked).some(node=>node.src?.endsWith('badge_state_locked_038.png')));
 locked.onclick();assert.equal(dialogs.length,1);assert.equal(all(panel).filter(node=>node.className==='room-piece').length,0);
 assert.equal(all(dialogs[0].body).some(node=>node.tag==='button'),false);
 assert.deepEqual(meta,before);
});
test('a received character unlock enables the next run and applies only its initial modifiers plus permanent bonuses',()=>{
 const p=createProfile();assert.equal(p.meta.unlockedCharacters.length,6);assert.throws(()=>startRun(p,1,'CH03'));
 p.meta.unlockedCharacters.push('CH03');p.meta.permanentBonuses={knowledge:3};assert.equal(studentCards(p.meta).find(c=>c.id==='CH03').selectable,true);
 const r=startRun(p,1,'CH03');assert.deepEqual(r.stats,{knowledge:53,expression:40,dexterity:50,exploration:50,magic:60});
 assert.equal(Object.keys(r.hiddenStats).length,8);assert.ok(Object.values(r.hiddenStats).every(value=>value===0));
 p.meta.permanentBonuses.magic=15;assert.equal(r.stats.magic,60);
 let raw;const repository=createLocalRepository({getItem:()=>raw,setItem:(_key,value)=>raw=value});repository.save(p);assert.equal(repository.load().slots[0].activeRun.characterId,'CH03');
});
