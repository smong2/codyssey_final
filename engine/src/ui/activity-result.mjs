export function createActivityResultUI({el,btn}){
 let overlay=null;
 const clear=()=>{overlay?.remove();overlay=null;};
 return {clear,show(host,{title='활동 결과',message='',details=[],result=null,buttonLabel='다음으로',symbol='✦'}={},onContinue=()=>{}){
  clear();overlay=el('dialog',null,'adventure-result-overlay activity-result-overlay');const active=overlay;
  overlay.setAttribute('aria-label',title);overlay.addEventListener('cancel',event=>event.preventDefault());
  const panel=el('section',null,'adventure-result paper activity-result');
  panel.setAttribute('aria-live','polite');panel.setAttribute('aria-atomic','true');
  if(symbol){const mark=el('div',symbol,'adventure-result-symbol');mark.setAttribute('aria-hidden','true');panel.append(mark);}
  panel.append(el('h2',title));if(message)panel.append(el('p',message,'activity-result-message'));
  if(result){
   const summary=el('section',null,'activity-result-summary');
   summary.append(el('strong',result.outcome,'activity-result-outcome'),el('span',result.activity,'activity-result-activity'));
   const changes=el('div',null,'activity-result-changes');
   changes.append(el('p',result.stamina,'activity-result-stamina'));
   for(const value of result.growth??[])changes.append(el('p',value,'activity-result-growth'));
   for(const value of result.transfers??[])changes.append(el('p',value,'activity-result-growth'));
   summary.append(changes);panel.append(summary);
  }
  for(const detail of details)if(typeof detail==='string'&&detail.trim())panel.append(el('p',detail,'adventure-result-effect'));
  const next=btn(buttonLabel,()=>{if(overlay!==active)return;next.disabled=true;clear();onContinue();},'adventure-result-next');
  panel.append(next);overlay.append(panel);host.append(overlay);overlay.showModal();next.focus?.();
 },isOpen:()=>Boolean(overlay)};
}
