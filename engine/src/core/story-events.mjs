// Local preview content based on story/npc and story/location proposals.
// These IDs never confirm authored story completion or award collection items.
export const ADVENTURE_NPCS=Object.freeze([
 {id:'CH01',name:'카엘',image:'kael1_base.png',preferredLocation:'library'},
 {id:'CH15',name:'로빈',image:'robin1_base.png',preferredLocation:'greenhouse'},
 {id:'CH31',name:'니코',image:'nico1_base.png',preferredLocation:'observatory'},
 {id:'CH02',name:'세라',image:'sera1_base.png',preferredLocation:'observatory'},
 {id:'CH08',name:'아이리스',image:'iris1_base.png',preferredLocation:'library'},
 {id:'CH16',name:'티아',image:'tia1_base.png',preferredLocation:'greenhouse'},
 {id:'CH25',name:'렌',image:'ren1_base.png',preferredLocation:'workshop'},
 {id:'CH26',name:'다나',image:'dana1_base.png',preferredLocation:'workshop'},
 {id:'NPC_LULU',name:'루루',image:null,preferredLocation:'greenhouse'}
].map(Object.freeze));
const LOCATIONS=['greenhouse','library','observatory'];
const emptyState=()=>({encounters:{},storyProgress:{},eventFlags:{},history:[],pending:null});
const stateOf=run=>run.storyState??emptyState();
const ensureState=run=>run.storyState??=emptyState();
const npcById=id=>ADVENTURE_NPCS.find(npc=>npc.id===id);
const progressOf=(state,id)=>state.storyProgress[id]??{step:0,lastWeek:0};
const rngFor=seed=>{let value=2166136261;for(const c of String(seed))value=Math.imul(value^c.charCodeAt(0),16777619);return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};};
const storyIdForNpc=id=>'preview-npc-'+id;
const storyIdForPlace=id=>'preview-location-'+id;
const maxStep=id=>id.startsWith('preview-npc-')?4:id==='preview-location-observatory'?4:1;
const knownStory=id=>ADVENTURE_NPCS.some(n=>storyIdForNpc(n.id)===id)||LOCATIONS.some(l=>storyIdForPlace(l)===id);

export function selectAdventureNpcs(run,locationId,seed){
 if(run.flags?.admissionPending||run.week<1||!LOCATIONS.includes(locationId))return [];
 const finished=chain=>run.narrativeState?.history?.some(h=>h.chain===chain&&h.step===4);
 const state=stateOf(run),rng=rngFor(seed),pool=ADVENTURE_NPCS.filter(n=>n.id!==run.characterId&&!(['CH16','CH15'].includes(n.id)&&finished('GUIDE'))&&!(['CH25','CH26'].includes(n.id)&&finished('WORK'))&&!(n.id==='NPC_LULU'&&finished('LULU'))),selected=[],count=1+Math.floor(rng()*2);
 for(let i=0;i<count&&pool.length;i++){
  const weights=pool.map(n=>{
   const encounter=state.encounters[n.id],progress=progressOf(state,storyIdForNpc(n.id));
   const unseenWeeks=encounter?Math.max(0,run.week-encounter.lastEncounterWeek):Math.max(0,run.week-1);
   return 100+(n.preferredLocation===locationId?50:0)+(progress.step>0&&progress.step<4?80:0)+(run.flags?.['main-related-'+n.id]?40:0)+Math.min(60,unseenWeeks*10);
  });
  let draw=rng()*weights.reduce((a,b)=>a+b,0),index=0;for(;index<weights.length-1&&draw>=weights[index];index++)draw-=weights[index];
  selected.push(pool.splice(index,1)[0]);
 }
 return selected;
}

export function recordAdventureEncounters(run,npcIds,{week,day}){
 if(!npcIds.length)return;
 const state=ensureState(run),token=`${run.runNumber}:${week}:${day}`;
 for(const id of new Set(npcIds)){
  if(id===run.characterId||!npcById(id))continue;
  const previous=state.encounters[id];if(previous?.lastToken===token)continue;
  state.encounters[id]={encounterCount:(previous?.encounterCount??0)+1,lastEncounterWeek:week,lastToken:token};
 }
}

export function queueActivityStory(run,{action,week,day,locationId}){
 if(action!=='adventure'||run.flags?.admissionPending||!LOCATIONS.includes(locationId))return null;
 const state=ensureState(run);if(state.pending)return state.pending;
 if(state.history.filter(h=>h.week===week).length>=2||state.history.some(h=>h.week===week&&h.day===day))return null;
 const npcCandidates=ADVENTURE_NPCS.filter(n=>n.id!==run.characterId&&n.preferredLocation===locationId&&state.encounters[n.id]?.encounterCount>0&&state.encounters[n.id].lastToken===`${run.runNumber}:${week}:${day}`).filter(n=>{
  const progress=progressOf(state,storyIdForNpc(n.id));return progress.step<4&&(progress.lastWeek===0||progress.lastWeek!==week&&progress.lastWeek!==week-1);
 });
 // Unseen one-shots take precedence over another stage of an ongoing story.
 const placeId=storyIdForPlace(locationId),placeProgress=progressOf(state,placeId);
 const freshNpc=npcCandidates.find(n=>progressOf(state,storyIdForNpc(n.id)).step===0);
 const npc=freshNpc??(placeProgress.step===0?null:npcCandidates[0]);
 const storyId=npc?storyIdForNpc(npc.id):placeId,progress=progressOf(state,storyId);
 if(progress.step>=maxStep(storyId))return null;
 const step=progress.step+1;
 state.pending={eventId:storyId+'-step-'+step,storyId,kind:npc?'npc':'location',npcId:npc?.id??null,locationId,week,day,step,previewOnly:true};
 return state.pending;
}

const PLACE_LINES={
 greenhouse:['허브 이름표가 바람에 돌아가 글자가 잘 보이지 않는다. 잠깐 살펴볼까?'],
 library:['통로 가장자리에 평범한 천 책갈피가 떨어져 있다. 반납 바구니가 가까이에 보인다.'],
 observatory:['오래된 관측 노트 첫 장에 엉뚱한 별자리 낙서가 남아 있다.','다음 장에는 늦은 관측 뒤 누군가 놓고 간 따뜻한 차가 적혀 있다.','차를 준 친구에게 자리를 맡아 주었다는 기록이 이어진다.','마지막 장에는 다음 방문자가 남길 작은 표식을 위한 빈칸이 있다.']
};
export function storyContent(event){
 const npc=npcById(event.npcId),placeLine=PLACE_LINES[event.locationId]?.[event.step-1];
 const line=npc?`${npc.name}와 다시 마주쳤다. ${event.step===1?'이곳에서 발견한 작은 것에 관해 이야기를 나눈다.':'지난번의 만남을 떠올리며 짧게 안부를 나눈다.'}`:placeLine;
 return {previewOnly:true,title:npc?npc.name+'와의 작은 만남':event.locationId==='observatory'?'천문대의 관측 일기':'장소의 작은 이야기',speaker:npc?.name??'이야기',image:npc?.image??null,line,
  choices:[{id:'look',label:'조금 더 살펴본다',reaction:npc?'잠시 곁에서 이야기를 나눈다.':'주변의 작은 흔적을 조금 더 살펴본다.'},{id:'leave',label:'오늘은 여기까지 본다',reaction:npc?'짧게 인사를 건네고 각자의 걸음을 이어 간다.':'지금 본 장면을 기억하고 천천히 자리를 떠난다.'}],
  closing:'아르카디아의 하루는 저마다의 속도로 이어진다.'};
}

export function completeStoryEvent(run,{eventId,choiceId}){
 const state=ensureState(run),pending=state.pending;
 if(!pending){if(state.history.some(h=>h.eventId===eventId))return false;throw new Error('완료할 이야기 장면이 없습니다.');}
 if(pending.eventId!==eventId||!storyContent(pending).choices.some(c=>c.id===choiceId))throw new Error('이야기 결과가 현재 장면과 일치하지 않습니다.');
 state.history.push({...pending,choiceId});state.storyProgress[pending.storyId]={step:pending.step,lastWeek:pending.week};state.eventFlags[pending.eventId]=choiceId;state.pending=null;return true;
}

export function validateStoryState(state){
 const record=o=>!!o&&typeof o==='object'&&!Array.isArray(o),week=n=>Number.isInteger(n)&&n>=1&&n<=52;
 const validEvent=e=>record(e)&&knownStory(e.storyId)&&e.previewOnly===true&&week(e.week)&&Number.isInteger(e.day)&&e.day>=0&&e.day<5&&LOCATIONS.includes(e.locationId)&&Number.isInteger(e.step)&&e.step>=1&&e.step<=maxStep(e.storyId)&&e.eventId===e.storyId+'-step-'+e.step&&
  (e.kind==='npc'?!!npcById(e.npcId)&&e.storyId===storyIdForNpc(e.npcId):e.kind==='location'&&e.npcId===null&&e.storyId===storyIdForPlace(e.locationId));
 const bad=()=>{throw new Error('이야기 진행 기록이 손상됐습니다. 원본을 보존했습니다.');};
 if(!record(state)||!record(state.encounters)||!record(state.storyProgress)||!record(state.eventFlags)||!Array.isArray(state.history)||state.history.length>104||!(state.pending===null||validEvent(state.pending)))bad();
 if(Object.entries(state.encounters).some(([id,e])=>!npcById(id)||!record(e)||!Number.isSafeInteger(e.encounterCount)||e.encounterCount<1||!week(e.lastEncounterWeek)||typeof e.lastToken!=='string'))bad();
 if(Object.entries(state.storyProgress).some(([id,p])=>!knownStory(id)||!record(p)||!Number.isInteger(p.step)||p.step<1||p.step>maxStep(id)||!week(p.lastWeek)))bad();
 const ids=new Set(),days=new Set(),weeks=new Map();
 for(const h of state.history){
  if(!validEvent(h)||!['look','leave'].includes(h.choiceId)||ids.has(h.eventId)||days.has(h.week+':'+h.day))bad();
  ids.add(h.eventId);days.add(h.week+':'+h.day);weeks.set(h.week,(weeks.get(h.week)??0)+1);if(weeks.get(h.week)>2)bad();
  if(state.eventFlags[h.eventId]!==h.choiceId)bad();
 }
 if(Object.keys(state.eventFlags).some(id=>!ids.has(id))||state.pending&&(ids.has(state.pending.eventId)||days.has(state.pending.week+':'+state.pending.day)||(weeks.get(state.pending.week)??0)>=2))bad();
 const progressIds=new Set(state.history.map(h=>h.storyId));
 if(Object.keys(state.storyProgress).length!==progressIds.size)bad();
 for(const id of progressIds){const steps=state.history.filter(h=>h.storyId===id).sort((a,b)=>a.step-b.step),p=state.storyProgress[id];if(!p||steps.some((h,i)=>h.step!==i+1)||p.step!==steps.length||p.lastWeek!==steps.at(-1).week)bad();}
 if(state.pending&&state.pending.step!==(state.storyProgress[state.pending.storyId]?.step??0)+1)bad();
 return state;
}
