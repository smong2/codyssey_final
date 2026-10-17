import {activityPlace,queueNarrative} from './narrative.mjs';

const tokenFor=(run,activity)=>`${run.runNumber}:${activity.week}:${activity.day}`;
const eligible=activity=>activity?.status==='COMPLETED'&&activity.effect?.outcome!=='interrupted'&&activityPlace(activity)!==null;
export function validatePendingActivityStory(run){
 const pending=run.pendingActivityStory;if(pending===undefined)return;
 const activity=run.actionHistory?.at(-1);
 if(!pending||Object.keys(pending).length!==1||!eligible(activity)||pending.activityToken!==tokenFor(run,activity)||
  activity.week!==run.week||activity.day!==run.day-1||run.inProgressActivity||run.narrativeState?.pending||run.storyState?.pending)
  throw new Error('활동 후 이야기 시작점이 완료 활동과 일치하지 않습니다.');
}

// `save` invokes its continuation only after a successful stable-boundary write.
// A failed write must retain that same continuation for the existing retry UI.
export function createPostActivityStoryFlow({current,save,receive,onStory,onContinue}){
 let awaitingSave=false;
 const persist=next=>{awaitingSave=true;return save(()=>{awaitingSave=false;next();});};
 const route=()=>current().narrativeState?.pending||current().storyState?.pending?onStory():onContinue();
 const resume=()=>{
  if(awaitingSave)return false;
  const run=current(),pending=run.pendingActivityStory;
  if(!pending){route();return true;}
  validatePendingActivityStory(run);
  const activity=run.actionHistory.at(-1),received=receive(pending.activityToken);
  queueNarrative(run,activity,received);
  delete run.pendingActivityStory;
  return persist(route);
 };
 return {resume,complete(activity,afterSaved=next=>next()){
  if(awaitingSave)return false;
  const run=current();
  if(eligible(activity)){
   run.pendingActivityStory={activityToken:tokenFor(run,activity)};
   validatePendingActivityStory(run);
  }
  return persist(()=>afterSaved(resume));
 }};
}
