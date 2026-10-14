export function weeklyActivityRecords(history=[]){
 const weeks=new Map();
 for(const activity of history){
  if(!weeks.has(activity.week))weeks.set(activity.week,{week:activity.week,activities:[]});
  weeks.get(activity.week).activities.push(activity);
 }
 return [...weeks.values()].sort((a,b)=>a.week-b.week).map(record=>({...record,activities:[...record.activities].sort((a,b)=>a.day-b.day)}));
}
