const STAT_NAMES={knowledge:'지식',expression:'표현력',dexterity:'솜씨',exploration:'탐험',magic:'마법'};
const HIDDEN_STAT_NAMES={curiosity:'호기심',prudence:'신중함',cooperation:'협력',empathy:'공감',responsibility:'책임감'};
const careers=[
 ['ENDING_RUNE_RESEARCHER','룬 연구자','magic','knowledge',['stat','knowledge',200],['hidden','curiosity',40],['class','magic',40]],
 ['ENDING_ARCADIA_EXPLORER','아르카디아 탐험가','exploration','knowledge',['stat','knowledge',200],['hidden','curiosity',40],['adventures','adventures',40]],
 ['ENDING_ARCANE_ARTISAN','마도 장인','magic','dexterity',['stat','dexterity',200],['hidden','prudence',40],['class','dexterity',40]],
 ['ENDING_HERB_GARDENER','약초 정원사','dexterity','exploration',['stat','exploration',200],['hidden','empathy',40],['adventures','adventures',40]],
 ['ENDING_ACADEMY_GUARDIAN','아카데미 수호 기사','dexterity','magic',['stat','magic',200],['hidden','responsibility',40],['importantChoices','importantChoices',10]],
 ['ENDING_ACADEMY_TEACHER','아카데미 교사','knowledge','expression',['stat','expression',200],['hidden','cooperation',40],['classes','classes',80]],
 ['ENDING_ARCHIVIST','아카이브 기록관','knowledge','exploration',['stat','exploration',200],['hidden','prudence',40],['locationsDiscovered','locationsDiscovered',10]],
 ['ENDING_MAGIC_PERFORMER','마법 공연가','expression','magic',['stat','magic',200],['hidden','empathy',40],['class','expression',40]],
 ['ENDING_MAGICAL_CREATURE_KEEPER','마법 생물 돌봄이','exploration','expression',['stat','expression',200],['hidden','empathy',40],['npcMeetings','npcMeetings',40]],
 ['ENDING_ACADEMY_EVENT_PLANNER','아카데미 행사 기획자','expression','knowledge',['stat','knowledge',200],['hidden','cooperation',40],['npcStoriesCompleted','npcStoriesCompleted',5]]
];
const RECORD_NAMES={adventures:'모험 횟수',importantChoices:'중요 선택',classes:'전체 수업',npcStoriesCompleted:'NPC 개별 스토리 완료',locationsDiscovered:'장소 발견',npcMeetings:'NPC 만남'};
const label=(kind,key)=>kind==='stat'?STAT_NAMES[key]??key:kind==='hidden'?HIDDEN_STAT_NAMES[key]??key:kind==='class'?`${STAT_NAMES[key]??key} 계열 수업`:RECORD_NAMES[key]??key;
function career(row){const [id,name,major,minor,...conditions]=row;return {id,name,majorStat:major,majorValue:300,requiredStat:major,requiredValue:300,minorStat:minor,optionalConditions:conditions.map(([kind,key,value])=>({kind,key,value}))};}
export const ENDING_CAREERS=Object.freeze(careers.map(career));
const completed=run=>(run.actionHistory??[]).filter(item=>item.status==='COMPLETED');
function counts(run){const actions=completed(run),encounters=run.storyState?.encounters,npcMeetings=encounters&&typeof encounters==='object'?Object.values(encounters).reduce((sum,value)=>sum+(Number.isSafeInteger(value?.encounterCount)?value.encounterCount:0),0):null;return {classes:actions.filter(a=>['class','rune-circuit','excavation','rune-link','training-guardian','rune-merge','mirror-magic','seal-dismantle'].includes(a.action)).length,
 adventures:actions.filter(a=>a.action==='adventure').length,
 importantChoices:run.records?.importantChoices??(run.mainStory?.history??[]).filter(s=>s.importantChoice).length,
 npcStoriesCompleted:run.records?.npcStoriesCompleted??null,
 locationsDiscovered:run.records?.locationsDiscovered??null,npcMeetings:run.records?.npcMeetings??npcMeetings,
 specialItemDiscoveries:run.records?.specialItemDiscoveries??null,
 classesByStat:{knowledge:0,expression:0,dexterity:0,exploration:0,magic:0}};}
function valueFor(run,record,condition){
 const {kind,key,value}=condition;
 if(kind==='stat')return Number.isFinite(run.stats?.[key])?run.stats[key]:null;
 if(kind==='hidden')return Number.isFinite(run.hiddenStats?.[key])?run.hiddenStats[key]:null;
 if(kind==='class')return record.classesByStat[key]??null;
 if(kind==='adventures'||kind==='classes'||kind==='importantChoices'||kind==='npcStoriesCompleted'||kind==='locationsDiscovered'||kind==='npcMeetings')return record[key]??null;
 return null;
}
function recordFor(run){
 const result=counts(run);const statByAction={
  'rune-circuit':'magic',excavation:'exploration','rune-link':'knowledge','training-guardian':'dexterity','rune-merge':'knowledge','mirror-magic':'magic','seal-dismantle':'exploration'};
 for(const item of completed(run)){const stat=statByAction[item.action]??item.stat;if(stat&&Object.hasOwn(result.classesByStat,stat))result.classesByStat[stat]++;}
 return result;
}
export function selectCareerEnding(run,meta={seenEndings:[]},random=Math.random){
 const records=recordFor(run),seen=new Set(meta.seenEndings??[]);
 const eligible=ENDING_CAREERS.filter(item=>(run.stats?.[item.majorStat]??0)>=item.majorValue).map(item=>{
  const checks=item.optionalConditions.map(condition=>{const actual=valueFor(run,records,condition);return {condition:{...condition,label:label(condition.kind,condition.key)},value:actual,met:actual!==null&&actual>=condition.value};});
  const representative= item.id==='ENDING_RUNE_RESEARCHER'?records.classesByStat.magic:item.id==='ENDING_ARCADIA_EXPLORER'?records.adventures:item.id==='ENDING_ARCANE_ARTISAN'?records.classesByStat.dexterity:item.id==='ENDING_HERB_GARDENER'?records.specialItemDiscoveries:item.id==='ENDING_ACADEMY_GUARDIAN'?records.importantChoices:item.id==='ENDING_ACADEMY_TEACHER'?records.classes:item.id==='ENDING_ARCHIVIST'?records.locationsDiscovered:item.id==='ENDING_MAGIC_PERFORMER'?records.classesByStat.expression:item.id==='ENDING_MAGICAL_CREATURE_KEEPER'?records.npcMeetings:item.id==='ENDING_ACADEMY_EVENT_PLANNER'?records.npcStoriesCompleted:records.classesByStat.dexterity;
  return {career:item,fit:checks.filter(c=>c.met).length,checks,representative:representative??-1,majorValue:run.stats[item.majorStat],seen:seen.has(item.id)};
 });
 const unseen=eligible.filter(item=>!item.seen);const pool=unseen.length?unseen:eligible;
 pool.sort((a,b)=>b.fit-a.fit||b.representative-a.representative||b.majorValue-a.majorValue);
 let chosen=pool[0];
 if(chosen){const tied=unseen.length?pool.filter(item=>item.fit===chosen.fit&&item.representative===chosen.representative&&item.majorValue===chosen.majorValue):pool; if(tied.length>1){const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw new Error('엔딩 동률 판정 입력이 올바르지 않습니다.');chosen=tied[Math.floor(value*tied.length)];}}
 const metricRecords=Object.entries({...records,...Object.fromEntries(Object.entries(records.classesByStat).map(([key,value])=>['class:'+key,value]))}).filter(([,value])=>Number.isFinite(value)||value===null).map(([key,value])=>({key,value}));
 if(chosen)return {type:'CAREER',career:chosen.career,fit:chosen.fit,checks:chosen.checks,records:metricRecords};
 return {type:'FALLBACK',career:{id:'ENDING_STARPATH_PIONEER',name:'별길 개척자',majorStat:null,majorValue:null,requiredStat:null,requiredValue:null,minorStat:null,optionalConditions:[]},fit:0,checks:[],records:metricRecords};
}
