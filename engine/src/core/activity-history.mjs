import {classOf} from './classes.mjs';
import {MAIN_STORIES} from './main-story.mjs';

export function storyDiaryRecords(run){
 const main=(run.mainStory?.history??[]).map(record=>({...structuredClone(record),kind:'main',title:record.title??MAIN_STORIES.find(story=>story.id===record.id)?.title??'완료한 이야기'}));
 const supplied=structuredClone(run.dialogueHistory??[]).map(record=>({...record,id:record.eventId,formal:true,kind:record.eventId.startsWith('MS')?'main':'dialogue'}));
 const seen=new Set();return [...supplied,...main,...structuredClone(run.storyState?.history??[]),...structuredClone(run.narrativeState?.history??[])].filter(record=>{const key=record.eventId??record.id;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>b.week-a.week||(b.day??0)-(a.day??0));
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
