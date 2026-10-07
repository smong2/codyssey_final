import {initialPuzzle} from './puzzle.mjs';
export const scenes=['entry','awakening','reveal','title','select','admission','arrivalTransition','plazaArrival','valentinus','sion','episodeTitle','greenhouse','adventure','reaction','choice','choiceReaction','room','bern','reflection','reflectionReply','record','diarySaved','reward','heartIntro','roomFree','bernTalk','bernTalkChoice','bernTalkReaction','bernRepeat','dayEnd','morningIntro','morning'];
export const factIds=['glassFlowerSoil','greenhouseSunlight','runeLightBroken'];
export const choiceIds=['together','time','ask'];
export const reflectionIds=['flower','rune','listen','speak'];
export function freshState(){
 return {version:2,scene:'entry',node:0,selectedCharacterId:null,selectedCharacterName:null,characterConfirmed:false,
  entryProgress:null,admissionRead:false,firstArrivalSeen:false,valentinusMet:false,sionMet:false,titleSeen:false,
  dayIndex:1,timeOfDay:'day',dayEndCompleted:false,morningSeen:false,episode1Status:'not-started',
  knowledge:[],herbs:0,restored:false,runeObserved:false,flowerRecoveredSeen:false,adventureIntroSeen:false,
  choice:null,reflection:null,reflectionCompleted:false,heartRecords:[],diarySaved:false,dayEndUnlocked:false,
  heartBalance:0,episode1HeartRewardClaimed:false,rewardReason:null,heartIntroSeen:false,bernShortTalkSeen:false,
  position:{x:180,y:920},puzzle:initialPuzzle(),hint:0};
}
export function inspectFact(s,id){if(!factIds.includes(id))throw Error('Unknown fact');if(!s.knowledge.includes(id))s.knowledge.push(id);if(id==='runeLightBroken')s.runeObserved=true;}
export function inspectPlant(s){if(s.restored)s.flowerRecoveredSeen=true;else inspectFact(s,'glassFlowerSoil');}
export function collectHerb(s){s.herbs=1;}
export function recoverWorld(s){s.restored=true;}
export function objectiveId(s){return s.restored?(s.flowerRecoveredSeen?'return':'changed'):'explore';}
export function applyEvent(state,event,content){
 const s=structuredClone(state);const go=scene=>{s.scene=scene;s.node=0;};
 switch(event.type){
 case 'scene':go(event.scene);break;
 case 'confirm':if(event.id!=='CH01')throw Error('Only Kael is playable');s.selectedCharacterId='CH01';s.selectedCharacterName='카엘';s.characterConfirmed=true;go('admission');break;
 case 'inspect':if(event.id==='glassFlowerSoil')inspectPlant(s);else inspectFact(s,event.id);break;
 case 'collect':collectHerb(s);break;
 case 'recover':recoverWorld(s);break;
 case 'return-sion':if(!s.restored)throw Error('Rune not connected');go('reaction');break;
 case 'choice':if(!choiceIds.includes(event.id))throw Error('Unknown choice');s.choice=event.id;go('choiceReaction');break;
 case 'resolve':s.episode1Status='resolved';s.timeOfDay='evening';go('room');break;
 case 'reflect':if(!reflectionIds.includes(event.id))throw Error('Unknown memory');s.reflection=event.id;s.reflectionCompleted=true;go('reflectionReply');break;
 case 'diary':{
  if(!s.reflectionCompleted||!s.choice||s.episode1Status!=='resolved')throw Error('Record is not ready');
  if(!s.heartRecords.some(r=>r.id==='EP01'))s.heartRecords.push({id:'EP01',episode:content.title,day:1,choice:s.choice,choiceText:content.choices.find(c=>c.id===s.choice)?.label??'',reflection:s.reflection,reflectionText:content.reflections.find(r=>r.id===s.reflection)?.label??''});
  s.diarySaved=true;go('diarySaved');break;
 }
 case 'reward':if(!s.diarySaved)throw Error('Save Diary first');if(!s.episode1HeartRewardClaimed){s.heartBalance+=100;s.episode1HeartRewardClaimed=true;s.rewardReason='EPISODE_COMPLETION_REWARD';}s.episode1Status='completed';s.dayEndUnlocked=true;go('reward');break;
 case 'bern-talk-complete':s.bernShortTalkSeen=true;go('roomFree');break;
 case 'day-end':if(!s.dayEndUnlocked)throw Error('Episode not completed');s.dayIndex=2;s.timeOfDay='morning';s.dayEndCompleted=true;go('dayEnd');break;
 case 'morning-seen':s.morningSeen=true;go('morning');break;
 default:throw Error('Unknown event');
 }
 if(!scenes.includes(s.scene))throw Error('Unknown scene');return s;
}
export function validateState(s){
 if(!s||s.version!==2||!scenes.includes(s.scene)||!Number.isInteger(s.node)||s.node<0||s.node>30)return false;
 const flags=['characterConfirmed','admissionRead','firstArrivalSeen','valentinusMet','sionMet','titleSeen','dayEndCompleted','morningSeen','restored','runeObserved','flowerRecoveredSeen','adventureIntroSeen','reflectionCompleted','diarySaved','dayEndUnlocked','episode1HeartRewardClaimed','heartIntroSeen','bernShortTalkSeen'];
 if(flags.some(k=>typeof s[k]!=='boolean'))return false;
 if(![null,'CH01'].includes(s.selectedCharacterId)||s.selectedCharacterName!==(s.selectedCharacterId?'카엘':null)||s.characterConfirmed!==!!s.selectedCharacterId)return false;
 if(![1,2].includes(s.dayIndex)||!['day','evening','morning'].includes(s.timeOfDay)||!['not-started','offered','started','resolved','completed'].includes(s.episode1Status))return false;
 if(!Array.isArray(s.knowledge)||s.knowledge.some(x=>!factIds.includes(x))||new Set(s.knowledge).size!==s.knowledge.length||![0,1].includes(s.herbs))return false;
 if(![null,...choiceIds].includes(s.choice)||![null,...reflectionIds].includes(s.reflection)||!Array.isArray(s.heartRecords))return false;
 if(s.heartRecords.some(r=>!r||r.id!=='EP01'||!choiceIds.includes(r.choice)||!reflectionIds.includes(r.reflection))||new Set(s.heartRecords.map(r=>r.id)).size!==s.heartRecords.length)return false;
 if(![0,100].includes(s.heartBalance)||![null,'EPISODE_COMPLETION_REWARD'].includes(s.rewardReason)||s.episode1HeartRewardClaimed!==(s.heartBalance===100))return false;
 if(!Number.isInteger(s.hint)||s.hint<0||s.hint>3||!Number.isFinite(s.position?.x)||s.position.x<48||s.position.x>1752||!Number.isFinite(s.position?.y)||s.position.y<48||s.position.y>1052)return false;
 const p=s.puzzle,initial=initialPuzzle();return !!p&&Array.isArray(p.rotations)&&p.rotations.length===9&&p.rotations.every(x=>Number.isInteger(x)&&x>=0&&x<4)&&p.rotations[0]===0&&p.rotations[8]===0&&JSON.stringify(p.masks)===JSON.stringify(initial.masks)&&JSON.stringify(p.solution)===JSON.stringify(initial.solution);
}
