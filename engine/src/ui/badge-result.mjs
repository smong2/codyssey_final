export function createBadgeResultUI({el}){
 let overlay=null;
 function clear(){overlay?.remove();overlay=null;}
 return {clear,isOpen:()=>Boolean(overlay?.isConnected),show(host,badges,onContinue){
  clear();if(!Array.isArray(badges)||!badges.length){onContinue?.();return;}
  overlay=el('dialog',null,'collection-result-overlay');const active=overlay;
  overlay.setAttribute('aria-label','배지 획득 결과');overlay.addEventListener('cancel',event=>event.preventDefault());
  const panel=el('section',null,'collection-result paper');panel.setAttribute('aria-live','polite');panel.setAttribute('aria-atomic','true');
  panel.append(el('div','✦','collection-result-symbol'),el('h2','새 배지를 획득했어요!'));
  const list=el('div',null,'collection-result-badges');
  for(const badge of badges){
   const card=el('article',null,'collection-result-badge'),layers=el('div',null,'badge-layer-stack collection-result-art');
   for(const file of badge.images){const image=el('img');image.src='./design-assets/badge/'+file;image.alt='';image.setAttribute('aria-hidden','true');layers.append(image);}
   card.append(layers,el('p',badge.badgeTitle),el('small',badge.categoryTitle));list.append(card);
  }
  const confirm=el('button','확인','collection-result-confirm');confirm.type='button';
  confirm.onclick=()=>{if(overlay!==active)return;confirm.disabled=true;clear();onContinue?.();};
  panel.append(list,confirm);overlay.append(panel);host.append(overlay);overlay.showModal();confirm.focus?.();
 }};
}
