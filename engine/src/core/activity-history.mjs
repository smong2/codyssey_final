import {classOf} from './classes.mjs';
import {MAIN_STORIES} from './main-story.mjs';

export function storyDiaryRecords(run){
 const main=(run.mainStory?.history??[]).map(record=>({...structuredClone(record),kind:'main',title:record.title??MAIN_STORIES.find(story=>story.id===record.id)?.title??'완료한 이야기'}));
 const supplied=structuredClone(run.dialogueHistory??[]).map(record=>{const id=record.eventId??record.storyId??'';return {...record,id:record.eventId??record.id??record.storyId,formal:true,kind:id.startsWith('MS')?'main':id.startsWith('NPC_')?'npc':id.startsWith('LOC_')?'location':'dialogue'};});
 const seen=new Set();return [...supplied,...main,...structuredClone(run.storyState?.history??[]),...structuredClone(run.narrativeState?.history??[])].filter(record=>{const key=record.eventId??record.id??record.storyId;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>b.week-a.week||(b.day??0)-(a.day??0));
}

export function weeklyActivityRecords(history=[]){
 const weeks=new Map();
 for(const activity of history){
  if(!weeks.has(activity.week))weeks.set(activity.week,{week:activity.week,activities:[]});
  weeks.get(activity.week).activities.push(activity);
 }
 return [...weeks.values()].sort((a,b)=>a.week-b.week).map(record=>({...record,activities:[...record.activities].sort((a,b)=>a.day-b.day)}));
}

const STAT_KEYS=['knowledge','expression','dexterity','exploration','magic'];
export function projectServerWeeklySummary(value,history=[]){
 if(!value||!Number.isInteger(value.week)||value.week<1||value.week>52||!value.statDelta||typeof value.statDelta!=='object')return null;
 const statChanges={};
 for(const stat of STAT_KEYS){
  const amount=value.statDelta[stat==='dexterity'?'skill':stat];
  if(!Number.isInteger(amount))return null;
  statChanges[stat]=amount;
 }
 for(const key of ['classCount','staminaSpent','staminaRecovered','startingStamina','endingStamina','forcedRestDays'])if(!Number.isInteger(value[key])||value[key]<0)return null;
 const detail=createWeeklySummary(history,value.week),classCounts=detail.classCount===value.classCount?detail.classCounts:{};
 return {week:value.week,activityCount:5,statChanges,classCount:value.classCount,classCounts,staminaSpent:value.staminaSpent,staminaRecovered:value.staminaRecovered,staminaAtStart:value.startingStamina,staminaAtEnd:value.endingStamina,forcedRestDays:value.forcedRestDays};
}
export function createWeeklySummary(history=[],week,storyHistory=[]){
 const activities=history.filter(item=>item?.week===week).sort((a,b)=>a.day-b.day);
 const statChanges=Object.fromEntries(STAT_KEYS.map(stat=>[stat,0]));
 const classCounts={};let classCount=0,staminaSpent=0,staminaRecovered=0,forcedRestDays=0;
 for(const item of activities){
  const effect=item.effect??{};
  for(const [stat,value] of Object.entries(effect.growth??{}))if(Object.hasOwn(statChanges,stat)&&Number.isFinite(value))statChanges[stat]+=value;
  if(classOf(item.action)&&item.status!=='INTERRUPTED'){classCounts[item.action]=(classCounts[item.action]??0)+1;classCount++;}
  if(Number.isFinite(effect.staminaChange)){staminaSpent+=Math.max(0,-effect.staminaChange);staminaRecovered+=Math.max(0,effect.staminaChange);}
  if(effect.forcedRest)forcedRestDays++;
 }
 for(const story of storyHistory.filter(item=>item?.week===week))for(const [stat,value] of Object.entries(story.effect?.growth??{}))if(Object.hasOwn(statChanges,stat)&&Number.isFinite(value))statChanges[stat]+=value;
 for(const item of activities)for(const [stat,value] of Object.entries(item.effect?.transferChanges??{}))if(Object.hasOwn(statChanges,stat)&&Number.isFinite(value))statChanges[stat]+=value;
 const first=activities[0]?.effect,last=activities.at(-1)?.effect;
 return {week,activityCount:activities.length,statChanges,classCount,classCounts,staminaSpent,staminaRecovered,
  staminaAtStart:Number.isFinite(first?.staminaAfter)&&Number.isFinite(first?.staminaChange)?first.staminaAfter-first.staminaChange:null,
  staminaAtEnd:Number.isFinite(last?.staminaAfter)?last.staminaAfter:null,forcedRestDays};
}
