import {studentCards,petCards} from '../core/catalogue.mjs';
import {appendCharacterInfo} from './character-info.mjs';
import {createBagButton} from './button-art.mjs';

export function renderCompanionPanel(host,ctx,kind){
 const {el,btn}=ctx,isCharacter=kind==='캐릭터';
 const readEntries=()=>isCharacter?studentCards(ctx.meta(),'bag'):petCards(ctx.meta(),ctx.activePet().id);
 const currentCharacter=()=>ctx.current()?.characterId;
 let entries=readEntries(),selectedId=(isCharacter?currentCharacter():ctx.activePet().id)??entries.find(item=>item.unlocked)?.id;
 if(!entries.some(item=>item.id===selectedId))selectedId=entries[0]?.id;
 let saving=false,saveError='';
 const layout=el('div',null,'collection-split'),list=el('section',null,'collection-list-panel');
 const grid=el('div',null,'bag-card-grid silhouette-card-grid');
 const detail=el('section',null,'collection-detail-panel'),body=el('div',null,'collection-detail-body');
 const footer=el('footer',null,'collection-detail-footer'),cards=new Map();
 list.setAttribute('aria-label',kind+' 목록');detail.setAttribute('aria-label',kind+' 상세 정보');
 list.append(grid);detail.append(body,footer);layout.append(list,detail);host.append(layout);
 const artSource=item=>isCharacter?'./character-assets/'+item.fullbody:'./design-assets/pet/'+item.image;
 for(const item of entries){
  const card=btn('',()=>{if(saving)return;selectedId=item.id;saveError='';paint();},'');
  card.setAttribute('type','button');
  card.setAttribute('aria-label',item.unlocked?'해금된 '+kind+' 정보 보기':'미해금 '+kind+' 해금 방법 보기');
  const image=el('img',null,'bag-portrait');image.src=artSource(item);image.alt='';image.setAttribute('aria-hidden','true');card.append(image);
  if(!item.unlocked){const lock=el('span','🔒','collection-lock');lock.setAttribute('aria-hidden','true');card.append(lock);}
  cards.set(item.id,card);grid.append(card);
 }
 async function choosePet(id){
  if(saving||ctx.isSaveFailed?.())return;
  saving=true;saveError='';paint();
  try{
   if(await ctx.onSelectPet(id)!==true)saveError='펫을 변경하지 못했어요. 다시 시도해 주세요.';
  }catch{saveError='펫을 변경하지 못했어요. 다시 시도해 주세요.';}
  finally{
   saving=false;
   if(layout.isConnected!==false)paint();
  }
 }
 function paint(){
  entries=readEntries();
  const item=entries.find(entry=>entry.id===selectedId);if(!item)return;
  for(const entry of entries){
   const card=cards.get(entry.id),active=isCharacter?entry.id===currentCharacter():entry.selected;
   card.className='collection-item-card collection-card-trigger silhouette-collection-card'+(!entry.unlocked?' locked-card':'')+(active?' active-collection-card':'')+(entry.id===selectedId?' is-inspected':'');
   card.setAttribute('aria-pressed',String(entry.id===selectedId));card.disabled=saving;
  }
  body.replaceChildren();footer.replaceChildren();
  const artwork=el('figure',null,'collection-detail-art'+(!item.unlocked?' is-locked':''));
  const image=el('img');image.src=artSource(item);image.alt=item.unlocked?item.name:'미해금 '+kind;artwork.append(image);body.append(artwork);
  if(!item.unlocked){
   const info=el('section',null,'collection-unlock-info');
   info.append(el('h2','해금 안내'),el('p',item.pendingUnlock?'조건 달성 완료 · 이번 회차를 마치면 만날 수 있어요.':isCharacter?'아직 만날 수 없는 학생이에요.':'아직 함께할 수 없는 펫이에요.'),el('h3','해금 조건'),el('p',item.unlockHint??item.condition??'해금 정보가 아직 등록되지 않았어요.'));
   if(isCharacter)info.append(el('p','조건 달성은 현재 회차에 기록되고, 회차 종료가 확정되면 다음 회차부터 사용할 수 있어요.'));
   body.append(info);
   const status=createBagButton({el,btn,label:item.pendingUnlock?'해금 예정':'미해금',onClick:()=>{}});status.disabled=true;footer.append(status);
  }else if(isCharacter){
   const info=el('section',null,'collection-character-info');appendCharacterInfo(info,item,el);body.append(info);
   const active=item.id===currentCharacter();
   const status=createBagButton({el,btn,label:active?'플레이 중':'새 회차에서 선택',onClick:()=>{},selected:active});status.disabled=true;
   footer.append(el('small',active?'현재 회차의 캐릭터입니다.':'캐릭터는 새 회차를 시작할 때 선택할 수 있어요.'),status);
  }else{
   const info=el('section',null,'collection-pet-info');
   const names={knowledge:'지식',expression:'표현력',dexterity:'솜씨',exploration:'탐험',magic:'마법'};
   info.append(el('h2',item.name),el('p',item.description),el('h3','함께하는 효과'),el('p',Object.entries(item.modifiers).map(([key,value])=>names[key]+' +'+value).join(' · ')));body.append(info);
   if(saveError)footer.append(el('p',saveError,'collection-selection-error'));
   const choose=createBagButton({el,btn,label:saving?'저장 중…':item.selected?'동행 중':'함께하기',onClick:()=>choosePet(item.id),selected:item.selected});
   choose.disabled=saving||item.selected||!ctx.onSelectPet||Boolean(ctx.isSaveFailed?.());footer.append(choose);
  }
 }
 paint();
}
