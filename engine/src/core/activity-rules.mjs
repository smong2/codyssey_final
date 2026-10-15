import {classOf} from './classes.mjs';

export const REST_OUTCOMES=Object.freeze([
 Object.freeze({recovery:40,text:'조금 더 쉬고 싶다'}),
 Object.freeze({recovery:50,text:'잘 쉬었다'}),
 Object.freeze({recovery:70,text:'너무 잘 쉬었다'})
]);
export const lowStamina=stamina=>stamina>=10&&stamina<=30;
export function forcedRestRemaining(run){
 if(run.forcedRestDays>0)return run.forcedRestDays;
 // Legacy version-1 saves used only exhausted. Loading never rewrites saved data.
 return run.exhausted||run.stamina<10?3:0;
}
export const currentAction=run=>forcedRestRemaining(run)?'rest':run.schedule[run.day];
export const isForcedRestDay=(run,index)=>Number.isInteger(index)&&index>=run.day&&index<run.day+forcedRestRemaining(run);
export function restOutcome(random=Math.random){
 const value=random();
 if(!Number.isFinite(value)||value<0||value>=1)throw new Error('휴식 결과 추첨 값이 올바르지 않습니다.');
 return REST_OUTCOMES[Math.floor(value*REST_OUTCOMES.length)];
}
const STAT_NAMES={knowledge:'지식',expression:'표현력',dexterity:'솜씨',exploration:'탐험',magic:'마법'};
export function validActivityEffect(effect){
 return !!effect&&typeof effect==='object'&&!Array.isArray(effect)&&
  ['success','failure','greatSuccess','timeout','complete','interrupted'].includes(effect.outcome)&&
  Number.isFinite(effect.staminaChange)&&Math.abs(effect.staminaChange)<=100&&
  Number.isFinite(effect.staminaAfter)&&effect.staminaAfter>=0&&effect.staminaAfter<=100&&
  typeof effect.forcedRest==='boolean'&&Number.isInteger(effect.forcedRestDays)&&effect.forcedRestDays>=0&&effect.forcedRestDays<=3&&
  !!effect.growth&&typeof effect.growth==='object'&&!Array.isArray(effect.growth)&&
  Object.entries(effect.growth).every(([stat,value])=>Object.hasOwn(STAT_NAMES,stat)&&Number.isFinite(value)&&value>=0&&value<=500)&&
  (effect.restRecovery===undefined||REST_OUTCOMES.some(r=>r.recovery===effect.restRecovery));
}
export function activityResultText(entry){
 const effect=entry?.effect;if(!effect)return '';
 const title=entry.action==='adventure'?'모험':classOf(entry.action)?.title??'휴식';
 const outcome=effect.forcedRest?(effect.forcedRestDays?'강제 휴식 · '+effect.forcedRestDays+'일 남음':'강제 휴식 완료'):
  entry.action==='rest'&&effect.outcome!=='interrupted'?REST_OUTCOMES.find(r=>r.recovery===effect.restRecovery)?.text:
  {success:'성공',failure:'실패',greatSuccess:'대성공',timeout:'시간 종료',complete:'완료',interrupted:'중단 복구'}[effect.outcome];
 const stamina='체력 '+(effect.staminaChange>0?'+':'')+effect.staminaChange+' ('+effect.staminaAfter+'/100)';
 const growth=Object.entries(effect.growth).filter(([,value])=>value>0).map(([stat,value])=>STAT_NAMES[stat]+' +'+value);
 return [title,outcome,stamina,...growth].filter(Boolean).join(' · ');
}
