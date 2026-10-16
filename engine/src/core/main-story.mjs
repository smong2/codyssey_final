const stories=[
 {id:'MS01',date:'1/1',week:1,title:'각자의 이유로 아카데미에'},
 {id:'MS02',date:'3/5',week:10,title:'온실을 삼킨 마법 덩굴'},
 {id:'MS03',date:'6/4',week:23,title:'시계탑의 도망친 종소리'},
 {id:'MS04',date:'9/3',week:36,title:'도망친 그림자를 찾아서'},
 {id:'MS05',date:'12/3',week:49,title:'별빛 축제의 마지막 소원'},
 {id:'MS06',date:'12/24',week:52,title:'우리가 지켜낸 것'}
];
export const MAIN_STORIES=Object.freeze(stories.map(story=>Object.freeze({...story,stages:Object.freeze(Array.from({length:5},(_,index)=>Object.freeze({id:`S${index+1}`,dialogue:null})))})));
export function ensureMainStoryState(run){
 if(run.mainStory)return run.mainStory;
 const completedIds=MAIN_STORIES.filter(story=>story.week<run.week).map(story=>story.id),current=MAIN_STORIES.find(story=>story.week===run.week);
 const isUnstartedWeek=run.phase==='PLANNING'&&run.day===0;
 if(current&&!isUnstartedWeek)completedIds.push(current.id);
 if(run.week===1&&!run.flags?.admissionPending&&!completedIds.includes('MS01'))completedIds.push('MS01');
 run.mainStory={completedIds,pendingId:null,history:[]};return run.mainStory;
}
export function dueMainStory(run){
 const state=run?.mainStory;if(!state)return null;
 if(state.pendingId)return MAIN_STORIES.some(story=>story.id===state.pendingId)?state.pendingId:null;
 const completed=new Set(state.completedIds??[]);
 return MAIN_STORIES.find(story=>story.week===run.week&&!completed.has(story.id))?.id??null;
}
export function completeMainStory(run,id,record={}){
 const story=MAIN_STORIES.find(item=>item.id===id);if(!story)throw new Error('등록되지 않은 메인 스토리입니다.');
 const state=run.mainStory??={completedIds:[],pendingId:null,history:[]};state.completedIds??=[];state.history??=[];
 if(state.completedIds.includes(id))return false;
 if(state.pendingId&&state.pendingId!==id)throw new Error('다른 메인 스토리가 진행 중입니다.');
 if(state.pendingId!==id&&story.week!==run.week)throw new Error('현재 주차에서 진행할 메인 스토리가 아닙니다.');
 const requestedGrowth=record.effect?.growth??{};
 if(!requestedGrowth||typeof requestedGrowth!=='object'||Array.isArray(requestedGrowth)||Object.entries(requestedGrowth).some(([stat,value])=>!['knowledge','expression','dexterity','exploration','magic'].includes(stat)||!Number.isFinite(value)||value<0||value>500))throw new Error('메인 스토리 성장 변화가 올바르지 않습니다.');
 const appliedGrowth={};for(const [stat,value]of Object.entries(requestedGrowth)){const before=run.stats[stat];if(!Number.isFinite(before)||before<0||before>500)throw new Error('현재 성장 스탯이 올바르지 않습니다.');run.stats[stat]=Math.min(500,before+value);appliedGrowth[stat]=run.stats[stat]-before;}
 state.completedIds.push(id);if(state.pendingId===id)state.pendingId=null;
 state.history.push({id,week:run.week,date:story.date, ...(record.choiceId?{choiceId:record.choiceId}:{}),...(record.importantChoice?{importantChoice:true}:{}),effect:{growth:appliedGrowth}});
 return true;
}
