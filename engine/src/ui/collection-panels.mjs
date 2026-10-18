import {BADGE_GROUPS,badgeProgress,badgeConditionText,ROOM_BACKGROUNDS,roomProgress,roomPieceImage} from '../core/collection-view.mjs';
import {unreadRoomIds} from '../core/collection-notices.mjs';
import {createBagButton,BAG_BUTTON_ART} from './button-art.mjs';
const ORNAMENTS=['star_030','bow_031','laurel_032','crown_033','gem_034','shell_035','wings_036','flower_037'];
export function renderBadgePanel(panel,{el,btn,meta}){
 const body=el('section',null,'collection-browser badge-browser'),sidebar=el('nav',null,'badge-category-list'),content=el('section',null,'badge-content');
 sidebar.setAttribute('aria-label','배지 대분류');content.setAttribute('aria-label','배지 소분류');body.append(sidebar,content);panel.append(body);
 let group=BADGE_GROUPS[0],expanded=0;const categories=[];
 const image=file=>{const node=el('img',null,'collection-square-art');node.src='./design-assets/badge/'+file;node.alt='';return node;};
 function detail(sub,state){
  const section=el('div',null,'badge-subgroup-detail'),grid=el('div',null,'badge-grid'),summary=el('div',null,'badge-summary');
  const next=state.earned===null?null:sub.thresholds.findIndex((_,index)=>!state.earned.includes(index+1));
  const hint=el('section',null,'collection-next-badge'),cards=[];
  const showCondition=(index,isNext=false)=>{
   hint.replaceChildren(el('h3',isNext?(index===-1?'소분류 완성':'다음 배지'):'획득 조건'));
   if(index===null)hint.append(el('p','배지 획득 기록을 기다리고 있어요.'));
   else if(index===-1)hint.append(el('p','8 / 8 · 모든 배지를 모았어요.'));
   else{
    const target=sub.thresholds[index];hint.append(el('p',badgeConditionText(sub,target)),el('small',state.current===null?'현재 진행 기록을 기다리고 있어요.':`현재 ${state.current} / ${target}`));
    if(state.current!==null){const progress=el('progress');progress.setAttribute('max',String(target));progress.setAttribute('value',String(Math.min(state.current,target)));progress.setAttribute('aria-label',badgeConditionText(sub,target));hint.append(progress);}
   }
   cards.forEach((card,i)=>{card.className='badge-tier'+(index===i?' is-selected':'');card.setAttribute('aria-pressed',String(index===i));});
  };
  sub.thresholds.forEach((target,index)=>{const earned=state.earned?.includes(index+1)??false,card=btn('',()=>showCondition(index),'badge-tier');
   card.setAttribute('aria-label',`${index+1}단계 · ${earned?'획득':'미획득'} · ${badgeConditionText(sub,target)}`);
   if(earned){const layers=el('div',null,'badge-layer-stack');for(const file of [group.frame,sub.symbol,'badge_ornament_'+ORNAMENTS[index]+'.png'])layers.append(image(file));card.append(layers);}else card.append(image('badge_state_locked_038.png'));
   card.append(el('span',(index+1)+'단계'),el('small',earned?'획득':state.earned===null?'기록 확인 대기':'미획득'));cards.push(card);grid.append(card);
  });
  const rewards=el('section',null,'collection-reward');rewards.append(el('h3','소분류 보상'));const nextReward=[2,5,8].find(tier=>!state.awardedMilestones.includes(tier));for(const tier of [2,5,8]){const paid=state.awardedMilestones.includes(tier),reward=el('p',(paid?'✓ 지급 완료 · ':tier===nextReward?'○ 다음 보상 · ':'○ 예정 · ')+tier+' / 8 · '+group.stat+' +1',paid?'reward-paid':tier===nextReward?'reward-next':'');rewards.append(reward);}rewards.append(el('small','자동 지급 · 영구 보너스는 다음 회차부터 적용됩니다.'));
  summary.append(hint,rewards);section.append(grid,summary);showCondition(next,true);return section;
 }
 function paint(){
  const scroll=content.scrollTop??0;content.replaceChildren();
  categories.forEach(({item,control})=>{const selected=item===group;control.className='bag-ui-button'+(selected?' is-selected':'');control.setAttribute('aria-pressed',String(selected));control.style.backgroundImage=`url("./design-assets/ui/${BAG_BUTTON_ART[selected?'selected':'default']}")`;});
  const states=group.subgroups.map(sub=>badgeProgress(meta(),group,sub)),known=states.every(state=>state.earned!==null),total=known?states.reduce((sum,state)=>sum+state.earned.length,0):null;
  const heading=el('div',null,'badge-group-heading');heading.append(el('h2',group.title),el('small',(total??'—')+' / 40'));if(total===40)heading.append(el('small','대분류 완성 · 추가 수치 보상 없음'));content.append(heading);
  group.subgroups.forEach((sub,index)=>{
   const state=states[index],open=index===expanded,complete=state.earned?.length===8,row=el('section',null,'badge-subgroup'+(open?' is-open':'')+(complete?' badge-group-complete':''));
   const toggle=btn('',()=>{expanded=open?-1:index;paint();content.querySelector?.('#badge-toggle-'+group.id+'-'+index)?.focus?.({preventScroll:true});},'badge-subgroup-toggle');
   const id=group.id+'-'+index;toggle.setAttribute('id','badge-toggle-'+id);toggle.setAttribute('aria-label',sub.title+' 배지 보기');toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-controls','badge-detail-'+id);
   toggle.append(el('span',sub.title),el('span',(state.earned?.length??'—')+' / 8','badge-subgroup-count'));
   if(complete){const mark=image('badge_state_complete_gold_039.png');mark.className='badge-complete-mark';toggle.append(mark);}
   const arrow=el('span',open?'⌃':'⌄','badge-chevron');arrow.setAttribute('aria-hidden','true');toggle.append(arrow);row.append(toggle);
   const region=open?detail(sub,state):el('div');region.setAttribute('id','badge-detail-'+id);region.hidden=!open;row.append(region);content.append(row);
  });content.scrollTop=scroll;
 }
 for(const item of BADGE_GROUPS){const control=createBagButton({el,btn,label:item.title,selected:item===group,onClick:()=>{group=item;expanded=0;content.scrollTop=0;paint();}});control.setAttribute('aria-label',item.title+' 배지 보기');categories.push({item,control});sidebar.append(control);}
 paint();
}
export function renderRoomPanel(panel,{el,btn,meta,settings=()=>({}),onSelectRoom,isSaveFailed=()=>false,onReadRoomNotices,modal}){
 const body=el('section',null,'collection-browser room-browser');panel.append(body);
 const button=(label,onClick)=>createBagButton({el,btn,label,onClick});
 const selected=room=>room.unlocked&&(settings()?.activeRoomBackgroundId??'default')===room.id;
 const image=(src,className)=>{const art=el('img',null,className);art.src=src;art.alt='';return art;};

 function openRoom(id){
  onReadRoomNotices?.(id);paint();
  const detail=el('section',null,'room-puzzle-detail');let failed=false;
  const select=()=>{
   try{failed=onSelectRoom?.(id)!==true;}catch{failed=true;}
   paint();paintDetail();
  };
  function paintDetail(){
   const room=roomProgress(meta(),id);detail.replaceChildren();
   if(room.theme)detail.append(el('p',room.theme+' · 퍼즐 조각','room-detail-theme'));
   if(id==='default'){
    if(room.images)detail.append(image('./world-assets/'+room.images.day,'room-detail-preview'));
    detail.append(el('p','기본 제공','room-piece-progress'));
   }else{
    const puzzle=el('div',null,'room-piece-grid');
    for(let index=0;index<12;index++){
     const owned=room.pieces.includes(index),piece=el('div',null,'room-piece'),src=roomPieceImage(room,index);
     piece.setAttribute('aria-label',(index+1)+'번 조각 · '+(owned?'획득':'미획득'));
     if(src)piece.append(image(src,'room-piece-art'));
     else if(owned&&room.images){piece.style.backgroundImage=`url('./world-assets/${room.images.day}')`;piece.style.backgroundPosition=`${index%4*100/3}% ${Math.floor(index/4)*50}%`;}
     else if(owned)piece.textContent='획득 · 이미지 대기';
     puzzle.append(piece);
    }
    const progress=el('progress',null,'room-collection-progress');progress.setAttribute('max','12');progress.setAttribute('value',String(room.pieces.length));progress.setAttribute('aria-label','배경 퍼즐 조각 수집');
    detail.append(puzzle,el('p',room.pieces.length+' / 12','room-piece-progress'),progress);
   }
   if(!room.unlocked)detail.append(el('p','조각을 모으면 배경이 조금씩 드러나요.','room-detail-help'),el('small','12조각을 모두 모으면 사용할 수 있어요.'));
   else if(selected(room))detail.append(el('p','✓ 현재 사용 중인 배경','room-detail-current'));
   else{
    detail.append(el('p',id==='default'?'언제든 이 배경으로 돌아올 수 있어요.':'배경 완성 · 직접 선택하면 사용할 수 있어요.','room-detail-help'));
    const use=button('이 배경 사용하기',select);use.disabled=!room.images||!onSelectRoom||isSaveFailed();detail.append(use);
   }
   if(failed){const error=el('section',null,'room-selection-error');error.setAttribute('role','alert');error.append(el('p','배경을 변경하지 못했어요. 다시 시도해 주세요.'),button('다시 시도',select));detail.append(error);}
  }
  paintDetail();const dialog=modal?.(roomProgress(meta(),id).title,detail);dialog?.classList?.add('room-puzzle-modal');
 }
 function paint(){
  const scroll=body.scrollTop;body.replaceChildren();const unread=new Set(unreadRoomIds(meta())),grid=el('div',null,'room-collection-grid');body.append(grid);
  for(const master of ROOM_BACKGROUNDS){
   const room=roomProgress(meta(),master.id),active=selected(room),item=el('article',null,'room-card-item');
   const card=btn('',()=>openRoom(room.id),'collection-item-card room-card-trigger'+(!room.unlocked?' is-locked':'')+(active?' is-current':''));
   card.setAttribute('aria-label',room.title+' · '+(room.id==='default'?'기본 제공':room.pieces.length+' / 12')+' · 상세 보기');card.setAttribute('aria-pressed',String(active));
   if(room.images)card.append(image('./world-assets/'+room.images.day,'room-card-art'));
   if(!room.unlocked)card.append(image('./design-assets/badge/badge_state_locked_038.png','room-card-lock'));
   if(active){const check=el('span','✓','room-current-check');check.setAttribute('aria-label','현재 사용 중인 배경');card.append(check);}
   item.append(card,el('h3',room.title),el('p',room.id==='default'?'기본 제공':room.pieces.length+' / 12'));
   if(room.theme)item.append(el('small',room.theme));if(unread.has(room.id))item.append(el('small','NEW','collection-new-indicator'));
   grid.append(item);
  }
  body.scrollTop=scroll;
 }
 paint();
}
