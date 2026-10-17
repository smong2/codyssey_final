import {validAction} from './classes.mjs';
import {isForcedRestDay} from './activity-rules.mjs';
// Internal Gregorian reference only: 1900 is non-leap and Jan 1 is Monday.
const DAY=86400000,BASE_YEAR=1900,BASE=Date.UTC(BASE_YEAR,0,1),ARCADIA_START_YEAR=327;
export function titleModel(profile){
 const saved=profile.slots.some(s=>s.status!=='EMPTY');
 return {startLabel:saved?'새로 시작하기':'시작하기',continueVisible:saved};
}
export function calendarModel(run,monthOffset=0){
 const offset=run.phase==='AWAITING_ENDING'?364:(run.week-1)*7+Math.min(run.day,5);
 const date=new Date(BASE+offset*DAY),first=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+monthOffset,1));
 const year=first.getUTCFullYear(),month=first.getUTCMonth(),lead=first.getUTCDay();
 const start=BASE+(run.week-1)*7*DAY;
 const cells=Array.from({length:42},(_,i)=>{
  const stamp=Date.UTC(year,month,i-lead+1),cellDate=new Date(stamp),day=cellDate.getUTCDate(),weekday=i%7;
  const weekend=weekday===0||weekday===6;
  const week=Math.floor((stamp-BASE)/(7*DAY))+1,actionIndex=weekend?null:weekday-1;
  const pastEntry=run.actionHistory?.find(h=>h.week===week&&h.day===actionIndex);
  const pastAction=pastEntry?.action??null;
  return {day,month:cellDate.getUTCMonth()+1,year:cellDate.getUTCFullYear(),outsideMonth:cellDate.getUTCMonth()!==month,past:stamp<date.getTime(),weekday,actionIndex,current:stamp===date.getTime(),inWeek:stamp>=start&&stamp<start+7*DAY,weekend,pastAction,pastLocationId:pastEntry?.locationId??null,pastWeekend:weekend&&week>=1&&week<run.week};
 });
 return {year,arcadiaYear:ARCADIA_START_YEAR+year-BASE_YEAR,month:month+1,day:date.getUTCDate(),weekday:date.getUTCDay(),season:['겨울','겨울','봄','봄','봄','여름','여름','여름','가을','가을','가을','겨울'][month],cells};
}
export function calendarActivity(run,cell,draft){
 return cell.pastAction??(cell.inWeek?(isForcedRestDay(run,cell.actionIndex)?'rest':run.phase==='PLANNING'?draft[cell.actionIndex]:run.schedule[cell.actionIndex]):null);
}
export function scheduleDraft(run){return Array.from({length:5},(_,i)=>run.phase==='PLANNING'&&isForcedRestDay(run,i)?'rest':run.schedule[i]??null);}
export function scheduleSession(previous,run){
 return previous?.run===run&&previous.week===run.week?previous:{run,week:run.week,draft:scheduleDraft(run),draftLocations:Array.from({length:5},(_,i)=>run.scheduleLocations?.[i]??(run.schedule[i]==='adventure'?'greenhouse':null))};
}
export function scheduleReady(draft){return draft.length===5&&draft.every(validAction);}
export function assignScheduleDay(run,draft,cell,activity){
 if(run.phase!=='PLANNING'||!cell?.inWeek||cell.weekend||isForcedRestDay(run,cell.actionIndex)||!validAction(activity))return false;
 draft[cell.actionIndex]=activity;return true;
}
export function assignScheduleActivity(run,draft,activity,actionIndex=null){
 if(run.phase!=='PLANNING'||!Array.isArray(draft)||draft.length!==5||!validAction(activity))return null;
 if(activity==='fairy-trade'&&draft.some((item,index)=>item===activity&&index!==actionIndex))return null;
 const index=actionIndex===null?draft.findIndex((item,i)=>!validAction(item)&&!isForcedRestDay(run,i)):actionIndex;
 if(!Number.isInteger(index)||index<0||index>=5||isForcedRestDay(run,index))return null;
 draft[index]=activity;return index;
}
