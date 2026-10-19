import {classOf} from './classes.mjs';

export const REST_OUTCOMES=Object.freeze([
 Object.freeze({recovery:40,text:'조금 더 쉬고 싶다'}),
 Object.freeze({recovery:50,text:'잘 쉬었다'}),
 Object.freeze({recovery:70,text:'너무 잘 쉬었다'})
]);
export const REST_CHOICES=Object.freeze({
 HOME:Object.freeze({id:'HOME',title:'집에서 쉰다',description:'푹 쉬면서 체력을 많이 회복해요.',recoveries:Object.freeze([60,70,80]),statGrowth:0}),
 FRIENDS:Object.freeze({id:'FRIENDS',title:'친구와 논다',description:'기분 전환을 하고 한 가지 힘을 조금 키워요.',recoveries:Object.freeze([40,50,60]),statGrowth:1}),
 HOBBY:Object.freeze({id:'HOBBY',title:'취미 활동을 한다',description:'좋아하는 일에 집중해 한 가지 힘을 키워요.',recoveries:Object.freeze([30,40,50]),statGrowth:2})
});
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
export function chosenRestOutcome(choice,random=Math.random){
 const option=REST_CHOICES[choice];if(!option)throw new Error('휴식 방법이 올바르지 않습니다.');
 const recoveryRoll=random();if(!Number.isFinite(recoveryRoll)||recoveryRoll<0||recoveryRoll>=1)throw new Error('휴식 결과 추첨 값이 올바르지 않습니다.');
 const recovery=option.recoveries[Math.floor(recoveryRoll*option.recoveries.length)],stats=Object.keys(STAT_NAMES);
 let stat=null;if(option.statGrowth){const statRoll=random();if(!Number.isFinite(statRoll)||statRoll<0||statRoll>=1)throw new Error('휴식 성장 추첨 값이 올바르지 않습니다.');stat=stats[Math.floor(statRoll*stats.length)];}
 return {choice:option.id,recovery,stat,growth:option.statGrowth,text:option.title};
}
export function validActivityEffect(effect){
 return !!effect&&typeof effect==='object'&&!Array.isArray(effect)&&
  ['success','failure','greatSuccess','timeout','complete','interrupted','transferred','skipped'].includes(effect.outcome)&&
  Number.isFinite(effect.staminaChange)&&Math.abs(effect.staminaChange)<=100&&
  Number.isFinite(effect.staminaAfter)&&effect.staminaAfter>=0&&effect.staminaAfter<=100&&
  typeof effect.forcedRest==='boolean'&&Number.isInteger(effect.forcedRestDays)&&effect.forcedRestDays>=0&&effect.forcedRestDays<=3&&
  !!effect.growth&&typeof effect.growth==='object'&&!Array.isArray(effect.growth)&&
  Object.entries(effect.growth).every(([stat,value])=>Object.hasOwn(STAT_NAMES,stat)&&Number.isFinite(value)&&value>=0&&value<=500)&&
  (effect.transferChanges===undefined||effect.outcome==='transferred'&&Object.entries(effect.transferChanges).length===2&&Object.entries(effect.transferChanges).every(([stat,value])=>Object.hasOwn(STAT_NAMES,stat)&&Number.isInteger(value)&&Math.abs(value)>=1&&Math.abs(value)<=5)&&Object.values(effect.transferChanges).reduce((sum,value)=>sum+value,0)===0)&&
  (effect.restRecovery===undefined||REST_OUTCOMES.some(r=>r.recovery===effect.restRecovery));
}
export function activityResultText(entry){
 const view=activityResultView(entry);if(!view)return '';
 return [view.activity,view.outcome,view.stamina,...view.growth,...view.transfers].filter(Boolean).join(' · ');
}
export function activityResultView(entry){
 const effect=entry?.effect;if(!effect)return '';
 const title=entry.action==='adventure'?'모험':entry.action==='fairy-trade'?'요정의 거래':classOf(entry.action)?.title??'휴식';
 const outcome=effect.forcedRest?(effect.forcedRestDays?'강제 휴식 · '+effect.forcedRestDays+'일 남음':'강제 휴식 완료'):
  entry.action==='rest'&&effect.outcome!=='interrupted'?REST_OUTCOMES.find(r=>r.recovery===effect.restRecovery)?.text??'휴식 완료':
  {success:'성공',failure:'실패',greatSuccess:'대성공',timeout:'시간 종료',complete:'완료',interrupted:'중단',transferred:'교환 완료',skipped:'건너뜀'}[effect.outcome];
 const stamina='체력 '+(effect.staminaChange>0?'+':'')+effect.staminaChange+' ('+effect.staminaAfter+'/100)';
 const growth=Object.entries(effect.growth).filter(([,value])=>value>0).map(([stat,value])=>STAT_NAMES[stat]+' +'+value);
 const transfers=Object.entries(effect.transferChanges??{}).filter(([,value])=>value<0).map(([from,value])=>{const to=Object.entries(effect.transferChanges).find(([,delta])=>delta===-value)?.[0];return STAT_NAMES[from]+' → '+STAT_NAMES[to]+' '+Math.abs(value);});
 return {activity:title,outcome,stamina,growth,transfers};
}
