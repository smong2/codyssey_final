export function createAdventureResultUI({el}){
 let overlay=null;
 function clear(){overlay?.remove();overlay=null;}
 return {clear,showFound(host,progress,onContinue){
  clear();overlay=el('dialog',null,'adventure-result-overlay');const active=overlay;
  overlay.setAttribute('aria-label','단서 발견');
  overlay.addEventListener('cancel',event=>event.preventDefault());
  const panel=el('section',null,'adventure-result paper success');
  panel.setAttribute('aria-live','polite');panel.setAttribute('aria-atomic','true');
  const symbol=el('div','✦','adventure-result-symbol');symbol.setAttribute('aria-hidden','true');
  const complete=progress.foundCount>=progress.objectiveCount,next=el('button',complete?'결과 확인 중...':'계속 탐색하기','adventure-result-next');next.type='button';next.disabled=complete;
  next.onclick=()=>{if(overlay!==active||complete)return;next.disabled=true;clear();onContinue();};
  panel.append(symbol,el('h2',complete?'목표를 모두 찾았어요!':'단서를 찾았어요!'),el('p',`찾은 단서 ${progress.foundCount} / ${progress.objectiveCount}`,'adventure-result-count'),next);
  overlay.append(panel);host.append(overlay);overlay.showModal();next.focus?.();
 },show(host,result,onContinue){
  clear();const success=result.outcome==='MISSION_COMPLETE';
  overlay=el('dialog',null,'adventure-result-overlay');const active=overlay;
  overlay.setAttribute('aria-label',success?'모험 성공 결과':'모험 시간 종료 결과');
  overlay.addEventListener('cancel',event=>event.preventDefault());
  const panel=el('section',null,'adventure-result paper'+(success?' success':' timeout'));
  panel.setAttribute('aria-live','polite');panel.setAttribute('aria-atomic','true');
  const symbol=el('div',success?'✦':'⌛','adventure-result-symbol');symbol.setAttribute('aria-hidden','true');
  const next=el('button','다음으로','adventure-result-next');next.type='button';
  next.onclick=()=>{if(overlay!==active)return;next.disabled=true;clear();onContinue();};
  panel.append(symbol,el('h2',success?'모험 성공!':'시간이 다 되었어요'),el('p',success?'목표를 모두 발견했어요.':'이번 모험은 여기까지예요.'),el('p',`찾은 목표 ${result.foundCount} / ${result.objectiveCount}`,'adventure-result-count'),el('p',result.feedback,'adventure-result-effect'),next);
  overlay.append(panel);host.append(overlay);overlay.showModal();next.focus?.();
 }};
}
