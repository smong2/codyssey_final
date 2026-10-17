import {classOf} from './classes.mjs';
import {STUDENTS} from './catalogue.mjs';
import {HIDDEN_STATS} from './character-start.mjs';
import {ADVENTURE_NPCS,recordAdventureEncounters} from './story-events.mjs';
const chains=[['GUIDE',[4,15,29,41],'plaza',['안내지 줍기','안내지 놓기','색 리본 고르기','남은 준비 돕기']],['WORK',[8,20,32,44],'workshop',['부품 모으기','필요한 부품 찾기','도구 정돈하기','작업대 살펴보기']],['LULU',[12,25,35,48],'greenhouse',['단추 발견','단추 보관하기','발견물 나누기','새 발견 함께 보기']]];
const locations=[['OBS','observatory',[[1,15,'틀린 별자리'],[5,28,'늦은 관측'],[8,13,'자리 맡아 주기'],[11,12,'빈 관측 칸']]],['CLK','plaza',[[1,29,'축제 리본 묶기'],[7,2,'종이 조각 줍기']]],['GH','greenhouse',[[2,12,'작은 허브에 물 주기'],[7,23,'이름표 돌려놓기']]],['DRM','dormitory',[[3,12,'창가 쿠션 놓기'],[6,11,'공용 컵 정리']]],['LIB','library',[[3,26,'책 한 권 제자리 찾기'],[9,10,'떨어진 책갈피']]],['WRK','workshop',[[4,16,'부품을 모양별로 놓기'],[10,1,'도구 닦아 두기']]],['TRN','training',[[5,7,'연습 깃발 정리'],[10,22,'표적 위치 바로잡기']]]];
const weekFor=(month,day)=>Math.floor((Date.UTC(1900,month-1,day)-Date.UTC(1900,0,1))/604800000)+1;
export const NARRATIVE_SCENES=[...chains.flatMap(([chain,weeks,locationId,titles])=>weeks.map((startWeek,index)=>({id:`NPC_${chain}_0${index+1}`,kind:'npc',chain,step:index+1,startWeek,locationId,title:titles[index]}))),...locations.flatMap(([code,locationId,stages])=>stages.map(([m,d,title],index)=>({id:`LOC_${code}_0${index+1}`,kind:'location',chain:'LOC_'+code,step:index+1,startWeek:weekFor(m,d),locationId,title})))];
export function narrativeActor(scene,characterId){
 const player=STUDENTS.find(c=>c.id===characterId),name=scene.chain==='GUIDE'?(player?.name==='티아'?'로빈':'티아'):scene.chain==='WORK'?(player?.name==='렌'?'다나':'렌'):'루루';
 const student=STUDENTS.find(c=>c.name===name);return {id:student?.id??'NPC_LULU',name,image:student?.image??null};
}
export function activityPlace(activity){return activity.action==='adventure'?activity.locationId??'greenhouse':activity.action==='fairy-trade'?'dormitory':classOf(activity.action)?.locationId??null;}
export function narrativeCandidates(run,activity){
 if(activity?.status!=='COMPLETED'||activity.effect?.outcome==='interrupted')return [];
 const history=run.narrativeState?.history??[],legacy=run.storyState?.history??[];
 if(run.flags?.admissionPending||run.mainStory?.pendingId||[...history,...legacy].filter(h=>h.week===activity.week).length>=2||[...history,...legacy].some(h=>h.week===activity.week&&h.day===activity.day))return [];
 return NARRATIVE_SCENES.filter(scene=>{
  if(scene.startWeek>activity.week||scene.locationId!==activityPlace(activity))return false;
  const previous=history.filter(h=>h.chain===scene.chain),last=previous.at(-1);if(scene.step!==(last?.step??0)+1)return false;
  if(scene.kind==='npc'){
   const actor=narrativeActor(scene,run.characterId);if(!(run.storyState?.encounters?.[actor.id]?.encounterCount>0))return false;
   if(last&&last.week>=activity.week-1)return false;
   if(scene.chain==='WORK'&&classOf(activity.action)?.stat!=='magic')return false;
  }
  return true;
 });
}
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const safeFlags=value=>object(value)&&Object.entries(value).every(([key,v])=>!['__proto__','prototype','constructor'].includes(key)&&(['string','boolean'].includes(typeof v)||typeof v==='number'&&Number.isFinite(v)));
const validGrowth=value=>object(value)&&Object.entries(value).every(([key,v])=>['knowledge','expression','dexterity','exploration','magic'].includes(key)&&Number.isInteger(v)&&Math.abs(v)<=500);
function validContent(content){return object(content)&&Array.isArray(content.lines)&&content.lines.length>0&&content.lines.every(line=>object(line)&&typeof line.text==='string'&&line.text.trim()&&(!line.speaker||typeof line.speaker==='string'))&&(!content.choices||Array.isArray(content.choices)&&new Set(content.choices.map(c=>c?.id)).size===content.choices.length&&content.choices.every(c=>object(c)&&typeof c.id==='string'&&c.id.trim()&&typeof c.label==='string'&&c.label.trim()&&typeof c.reaction==='string'&&c.reaction.trim()&&(c.growth===undefined||validGrowth(c.growth))&&(c.flags===undefined||safeFlags(c.flags)))&&(!content.choices.length||typeof content.closing==='string'&&content.closing.trim()));}
export function queueNarrative(run,activity,received){
 if(run.narrativeState?.pending)return run.narrativeState.pending;
 if(!received||received.activityToken!==`${run.runNumber}:${activity.week}:${activity.day}`)return null;
 if(received.kind==='greeting'){
  const actor=greetingActor(run,received.npcId);
  if(!actor||!activityPlace(activity)||activity.status!=='COMPLETED'||activity.effect?.outcome==='interrupted'||run.flags?.admissionPending||run.mainStory?.pendingId||activity.week<1)return null;
  const state=run.narrativeState??={history:[],pending:null,flags:{}};
  state.pending={id:'GREETING_'+actor.id,kind:'greeting',title:actor.name+'와의 만남',week:activity.week,day:activity.day,locationId:activityPlace(activity),actor,
   content:validContent(received.content)&&!(received.content.choices?.length)?structuredClone(received.content):null};
  return state.pending;
 }
 const scene=narrativeCandidates(run,activity).find(item=>item.id===received.eventId);if(!scene)return null;
 const state=run.narrativeState??={history:[],pending:null,flags:{}};
 state.pending={...scene,week:activity.week,day:activity.day,actor:scene.kind==='npc'?narrativeActor(scene,run.characterId):null,content:validContent(received.content)?structuredClone(received.content):null};return state.pending;
}
export function finishNarrative(run,choiceId=null){
 const state=run.narrativeState,pending=state?.pending;if(!pending)return false;
 // Showing an unregistered frame is never authored story completion.
 if(!pending.content){state.pending=null;return false;}
 if(pending.kind==='greeting'){
  recordAdventureEncounters(run,[pending.actor.id],pending);state.pending=null;return true;
 }
 const choices=pending.content.choices??[],choice=choices.find(c=>c.id===choiceId);if(choices.length&&!choice)throw new Error('현재 이야기의 선택이 아닙니다.');
 const delta=choice?.growth??{};for(const [key,value]of Object.entries(delta))if(!Object.hasOwn(run.stats,key)||!Number.isInteger(value)||value< -500||value>500)throw new Error('이야기 성장 데이터가 올바르지 않습니다.');
 const hidden=choice?.hiddenDelta??{};for(const [key,value]of Object.entries(hidden))if(!HIDDEN_STATS.includes(key)||!Number.isFinite(run.hiddenStats?.[key])||run.hiddenStats[key]<0||run.hiddenStats[key]>300||!Number.isInteger(value)||value<0||value>300)throw new Error('보이지 않는 스탯은 초기값과 0~300 범위의 증가 데이터가 필요합니다.');
 const flags=choice?.flags??{};if(!safeFlags(flags))throw new Error('이야기 플래그가 올바르지 않습니다.');
 const actualGrowth={};for(const [key,value]of Object.entries(delta)){const before=run.stats[key];run.stats[key]=Math.max(0,Math.min(500,before+value));actualGrowth[key]=run.stats[key]-before;}
 for(const [key,value]of Object.entries(hidden))run.hiddenStats[key]=Math.min(300,run.hiddenStats[key]+value);
 if(pending.kind==='npc')recordAdventureEncounters(run,[pending.actor.id],pending);
 Object.assign(state.flags,flags);state.history.push({id:pending.id,kind:pending.kind,chain:pending.chain,step:pending.step,week:pending.week,day:pending.day,locationId:pending.locationId,choiceId:choice?.id??null,choiceLabel:choice?.label??null,closing:pending.content.closing??'',importantChoice:choice?.importantChoice===true,effect:{growth:actualGrowth}});state.pending=null;return true;
}
export function dismissNarrative(run){if(run.narrativeState)run.narrativeState.pending=null;}
function greetingActor(run,npcId){
 const actor=ADVENTURE_NPCS.find(n=>n.id===npcId&&n.id!==run.characterId);if(!actor)return null;
 const finished=['GUIDE','WORK','LULU'].some(chain=>run.narrativeState?.history?.some(h=>h.chain===chain&&h.step===4)&&narrativeActor({chain},run.characterId).id===npcId);
 return finished?null:{id:actor.id,name:actor.name,image:actor.image};
}
export function validateNarrativeState(state,run){
 const valid=event=>{const master=NARRATIVE_SCENES.find(s=>s.id===event?.id);return !!master&&master.kind===event.kind&&master.locationId===event.locationId&&master.chain===event.chain&&master.step===event.step&&Number.isInteger(event.week)&&event.week>=master.startWeek&&event.week<=run.week&&Number.isInteger(event.day)&&event.day>=0&&event.day<5&&(run.actionHistory??[]).some(a=>a.status==='COMPLETED'&&a.week===event.week&&a.day===event.day&&activityPlace(a)===master.locationId);};
 const pending=state?.pending,greeting=pending?.kind==='greeting';
 const actor=greeting?greetingActor(run,pending.actor?.id):null;
 const validGreeting=greeting&&actor&&pending.id==='GREETING_'+actor.id&&pending.actor.name===actor.name&&pending.actor.image===actor.image&&Number.isInteger(pending.week)&&pending.week>=1&&pending.week===run.week&&
  (run.actionHistory??[]).some(a=>a.status==='COMPLETED'&&a.effect?.outcome!=='interrupted'&&a.week===pending.week&&a.day===pending.day&&activityPlace(a)===pending.locationId)&&!(pending.content?.choices?.length);
 if(!state||!Array.isArray(state.history)||state.history.length>28||!safeFlags(state.flags)||pending!==null&&!(greeting?validGreeting:valid(pending))||state.history.some(h=>!valid(h)||!validGrowth(h.effect?.growth??{})||h.choiceLabel!==null&&typeof h.choiceLabel!=='string'||typeof h.closing!=='string'))throw new Error('정식 이야기 기록이 손상됐습니다.');
 const ids=new Set(),days=new Set(),counts=new Map(),steps=new Map(),weeks=new Map();
 for(const legacy of run.storyState?.history??[]){days.add(legacy.week+':'+legacy.day);counts.set(legacy.week,(counts.get(legacy.week)??0)+1);}
 for(const h of [...state.history,...(state.pending&&!greeting?[state.pending]:[])]){if(ids.has(h.id)||days.has(h.week+':'+h.day)||h.step!==(steps.get(h.chain)??0)+1||h.kind==='npc'&&weeks.has(h.chain)&&h.week<=weeks.get(h.chain)+1)throw new Error('이야기 순서·중복 기록이 올바르지 않습니다.');ids.add(h.id);days.add(h.week+':'+h.day);steps.set(h.chain,h.step);weeks.set(h.chain,h.week);counts.set(h.week,(counts.get(h.week)??0)+1);if(counts.get(h.week)>2)throw new Error('주간 이야기 수가 올바르지 않습니다.');}
 if(state.pending&&(run.inProgressActivity||run.storyState?.pending||state.pending.week!==run.week||state.pending.day!==run.day-1||state.pending.content!==null&&!validContent(state.pending.content)))throw new Error('진행 중 이야기 데이터가 올바르지 않습니다.');
 return state;
}
