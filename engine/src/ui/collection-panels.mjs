import {BADGE_GROUPS,badgeProgress,ROOM_BACKGROUNDS,roomProgress} from '../core/collection-view.mjs';
import {unreadRoomIds} from '../core/collection-notices.mjs';
const ORNAMENTS=['star_030','bow_031','laurel_032','crown_033','gem_034','shell_035','wings_036','flower_037'];
export function renderBadgePanel(panel,{el,btn,meta}){
 const body=el('section',null,'collection-browser');panel.append(body);
 const image=file=>{const node=el('img',null,'collection-square-art');node.src='./design-assets/badge/'+file;node.alt='';return node;};
 function paint(group=null,sub=null){body.replaceChildren();const nav=el('nav',null,'collection-breadcrumb');nav.append(btn('배지',()=>paint()));if(group)nav.append(btn(group.title,()=>paint(group)));if(sub)nav.append(el('span',sub.title));body.append(nav);const grid=el('div',null,'bag-card-grid');body.append(grid);
  if(!group){for(const item of BADGE_GROUPS){const complete=item.subgroups.every(sub=>badgeProgress(meta(),item,sub).earned?.length===8),b=btn('',()=>paint(item),'collection-item-card'+(complete?' badge-group-complete':''));b.append(image(item.frame),el('h2',item.title));if(complete)b.append(el('small','40 / 40 · 대분류 완성'));grid.append(b);}return;}
  if(!sub){for(const item of group.subgroups){const state=badgeProgress(meta(),group,item),b=btn('',()=>paint(group,item),'collection-item-card');b.append(image(item.symbol),el('h3',item.title),el('p',(state.earned?state.earned.length:'—')+' / 8'));if(state.earned?.length===8)b.append(image('badge_state_complete_gold_039.png'));grid.append(b);}return;}
  const state=badgeProgress(meta(),group,sub);
  sub.thresholds.forEach((target,index)=>{const earned=state.earned?.includes(index+1)??false,card=el('article',null,'collection-item-card badge-tier');
   if(earned){const layers=el('div',null,'badge-layer-stack');for(const file of [group.frame,sub.symbol,'badge_ornament_'+ORNAMENTS[index]+'.png'])layers.append(image(file));card.append(layers);}else card.append(image('badge_state_locked_038.png'));
   card.append(el('h3',(index+1)+'단계'),el('p',sub.condition+' · '+target),el('small',state.current===null?'현재 진행도 연결 대기':'현재 '+state.current+' / '+target));grid.append(card);
  });
  const rewards=el('section',null,'collection-reward');rewards.append(el('h3','소분류 보상'));for(const tier of [2,5,8])rewards.append(el('p',(state.awardedMilestones.includes(tier)?'✓ ':'○ ')+tier+' / 8 · '+group.stat+' +1'));rewards.append(el('small','영구 보너스는 다음 회차부터 적용됩니다.'));body.append(rewards);
 }
 paint();
}
export function renderRoomPanel(panel,{el,btn,meta,settings=()=>({}),onSelectRoom,isSaveFailed=()=>false,onReadRoomNotices}){
 const body=el('section',null,'collection-browser');panel.append(body);
 function paint(id=null){body.replaceChildren();if(id){onReadRoomNotices?.(id);body.append(btn('마이룸 목록',()=>paint()));const room=roomProgress(meta(),id);body.append(el('h2',room.title));const puzzle=el('div',null,'room-piece-grid');
   for(let index=0;index<12;index++){const owned=room.pieces.includes(index),piece=el('div',owned?'':'?','room-piece');piece.setAttribute('aria-label',(index+1)+'번 조각 · '+(owned?'획득':'미획득'));if(owned&&room.images){piece.style.backgroundImage=`url('./world-assets/${room.images.day}')`;piece.style.backgroundPosition=`${index%4*100/3}% ${Math.floor(index/4)*50}%`;}else if(owned)piece.textContent='획득 · 이미지 대기';puzzle.append(piece);}body.append(puzzle,el('p',room.pieces.length+' / 12'));if(!room.images)body.append(el('small','배경별 이미지 연결 대기'));return;}
  const unread=new Set(unreadRoomIds(meta()));const grid=el('div',null,'bag-card-grid');body.append(grid);for(const master of ROOM_BACKGROUNDS){const room=roomProgress(meta(),master.id),selected=(settings().activeRoomBackgroundId??'default')===room.id,card=el('article',null,'collection-item-card');
   if(room.images&&(room.id==='default'||room.unlocked)){const art=el('img',null,'bag-room-image');art.src='./world-assets/'+room.images.day;art.alt=room.title;card.append(art);}else card.append(el('div','🔒','room-art-placeholder'));
   card.append(el('h3',room.title),el('p',room.id==='default'?'기본 제공':room.pieces.length+' / 12'));if(unread.has(room.id))card.append(el('small','NEW','collection-new-indicator'));if(room.id!=='default')card.append(btn('퍼즐 보기',()=>paint(room.id)));
   if(room.unlocked){const use=btn(selected?'사용 중':'사용하기',async()=>{if(await onSelectRoom?.(room.id))paint();});use.disabled=selected||!room.images||isSaveFailed();card.append(use);}grid.append(card);
  }
 }
 paint();
}
