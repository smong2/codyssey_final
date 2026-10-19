export function createAdventureResultUI({el}){
 let overlay=null,investigation=null,animationFrame=null;
 function stopAnimation(){if(animationFrame!==null)cancelAnimationFrame(animationFrame);animationFrame=null;}
 function clear(){stopAnimation();overlay?.remove();overlay=null;investigation=null;}
 return {clear,showInvestigation(host,{durationMs},onContinue){
  clear();overlay=el('dialog',null,'adventure-result-overlay');const active=overlay;
  overlay.setAttribute('aria-label','조사 중');overlay.addEventListener('cancel',event=>event.preventDefault());
  const panel=el('section',null,'adventure-result paper adventure-investigation');
  panel.setAttribute('aria-live','polite');panel.setAttribute('aria-atomic','true');
  const symbol=el('div','⌛','adventure-result-symbol');symbol.setAttribute('aria-hidden','true');
  const title=el('h2','찾는 중...'),description=el('p','주변을 자세히 살펴보고 있어요.'),count=el('p','','adventure-result-count');count.hidden=true;
  const art=el('img',null,'adventure-found-art');art.hidden=true;art.onerror=()=>{art.hidden=true;};
  const bar=el('progress',null,'adventure-investigation-progress');bar.max=1;bar.value=0;bar.setAttribute('aria-label','조사 진행률');
  const next=el('button','확인','adventure-result-next');next.type='button';next.disabled=true;
  next.onclick=()=>{if(overlay!==active||next.disabled)return;next.disabled=true;clear();onContinue();};
  investigation={panel,symbol,title,description,count,bar,next,art};
  panel.append(symbol,title,art,description,count,bar,next);overlay.append(panel);host.append(overlay);overlay.showModal();
  const startedAt=performance.now(),duration=Number.isFinite(durationMs)&&durationMs>0?durationMs:1000;
  const animate=time=>{animationFrame=null;if(overlay!==active)return;bar.value=Math.min(1,Math.max(0,(time-startedAt)/duration));if(bar.value<1)animationFrame=requestAnimationFrame(animate);};
  animationFrame=requestAnimationFrame(animate);
 },finishInvestigation(result){
  if(!investigation)return;
  stopAnimation();const {panel,symbol,title,description,count,bar,next,art}=investigation,found=Boolean(result.foundId);
  panel.setAttribute('data-has-clue',String(Boolean(found&&result.item?.imageSrc)));
  symbol.hidden=Boolean(found&&result.item?.imageSrc);
  overlay.setAttribute('aria-label','조사 결과');symbol.textContent=found?'✦':'⌕';title.textContent=found?'단서를 찾았어요!':'아직 단서를 찾지 못했어요';
  description.textContent=found?(result.item?.name??'숨은 단서를 발견했어요.'):result.hint??'주변에 새로운 단서가 없어요.';
  if(found&&result.item?.imageSrc){art.src=result.item.imageSrc;art.alt=result.item.name??'';art.hidden=false;}
  count.textContent=`찾은 단서 ${result.foundCount} / ${result.objectiveCount}`;count.hidden=false;
  bar.value=1;next.disabled=false;next.focus?.();
 },showFound(host,progress,onContinue){
  clear();overlay=el('dialog',null,'adventure-result-overlay');const active=overlay;
  overlay.setAttribute('aria-label','단서 발견');
  overlay.addEventListener('cancel',event=>event.preventDefault());
  const panel=el('section',null,'adventure-result paper success');
  panel.setAttribute('aria-live','polite');panel.setAttribute('aria-atomic','true');
  const symbol=el('div','✦','adventure-result-symbol');symbol.setAttribute('aria-hidden','true');
  const complete=progress.foundCount>=progress.objectiveCount,next=el('button',complete?'결과 확인하기':'계속 탐색하기','adventure-result-next');next.type='button';
  next.onclick=()=>{if(overlay!==active)return;next.disabled=true;clear();onContinue();};
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
