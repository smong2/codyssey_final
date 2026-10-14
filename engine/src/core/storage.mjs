import {createProfile,CHARACTERS} from './state.mjs';
import {validAction} from './classes.mjs';
import {unlockedPetIds} from './pets.mjs';
export const STORAGE_KEY='lumia.engine.dev.v1';
export function createBoundaryWriter(repository){
 let pending=null,source=null,savedSlotId=null;
 function retry(){
  if(!pending)return;
  repository.save(pending);
  if(savedSlotId!==null){source.meta.lastSavedSlotId=savedSlotId;source.slots[savedSlotId-1].lastSavedAt=pending.slots[savedSlotId-1].lastSavedAt;}
  pending=null;source=null;savedSlotId=null;
 }
 return {save(profile,slotId=null){
  pending=structuredClone(profile);source=profile;savedSlotId=Number.isInteger(slotId)&&pending.slots[slotId-1]&&pending.slots[slotId-1].status!=='EMPTY'?slotId:null;
  if(savedSlotId!==null){pending.meta.lastSavedSlotId=savedSlotId;pending.slots[savedSlotId-1].lastSavedAt=new Date().toISOString();}
  retry();
 },retry};
}
export function validateProfile(p){
 if(p?.version!==1||!p.meta||!Array.isArray(p.meta.unlockedCharacters)||!Array.isArray(p.meta.badges)||!p.meta.counters||!Array.isArray(p.slots)||p.slots.length!==5)throw new Error('지원하지 않거나 손상된 저장 데이터입니다. 원본을 보존했습니다.');
 for(const key of ['minigames','classes','adventures'])if(!Number.isSafeInteger(p.meta.counters[key])||p.meta.counters[key]<0)throw new Error('누적 기록이 손상됐습니다.');
 p.slots.forEach((s,i)=>{
  if(s.slotId!==i+1||!['EMPTY','PLAYING','RUN_COMPLETE'].includes(s.status)||!Number.isInteger(s.completedRunCount)||s.completedRunCount<0)throw new Error('슬롯 데이터가 손상됐습니다.');
  const r=s.activeRun;
  if(s.status==='PLAYING'&&(!r||!Number.isInteger(r.week)||r.week<1||r.week>52||!Number.isInteger(r.day)||r.day<0||r.day>5||!['PLANNING','ACTING','WEEK_COMPLETE','AWAITING_ENDING'].includes(r.phase)||!Array.isArray(r.schedule)||!r.stats||!Number.isFinite(r.stamina)||r.stamina<0||r.stamina>100))throw new Error('회차 데이터가 손상됐습니다.');
  if(s.status!=='PLAYING'&&r!==null)throw new Error('슬롯 상태가 회차와 일치하지 않습니다.');
  if(s.status==='PLAYING'){
   if(r.actionHistory!==undefined){
    const seen=new Set();
    if(!Array.isArray(r.actionHistory)||r.actionHistory.length>260||r.actionHistory.some(h=>{
     if(!h||!Number.isInteger(h.week)||h.week<1||h.week>r.week||!Number.isInteger(h.day)||h.day<0||h.day>4||!validAction(h.action)||h.week===r.week&&h.day>=r.day)return true;
     const key=h.week+':'+h.day;if(seen.has(key))return true;seen.add(key);return false;
    }))throw new Error('지난 일정 기록이 손상됐습니다. 원본을 보존했습니다.');
   }
   const validCharacter=CHARACTERS.some(c=>c.id===r.characterId)&&p.meta.unlockedCharacters.includes(r.characterId);
   const validStats=['knowledge','expression','dexterity','exploration','magic'].every(k=>Number.isFinite(r.stats[k])&&r.stats[k]>=0&&r.stats[k]<=500);
   const validPlan=r.phase==='PLANNING'?r.day===0&&r.schedule.length===0:
    r.schedule.length===5&&r.schedule.every(validAction)&&(r.phase==='ACTING'?r.day<5:r.day===5);
   if(!validCharacter||!validStats||!validPlan||!Number.isInteger(r.runNumber)||r.runNumber!==s.completedRunCount+1||typeof r.exhausted!=='boolean'||r.phase==='AWAITING_ENDING'&&r.week!==52)throw new Error('캐릭터·스탯·일정 데이터가 손상됐습니다.');
  }
 });return p;
}
// Replace the repository adapter with an account API later.
export function createLocalRepository(storage){return {
 load(){const raw=storage.getItem(STORAGE_KEY);return raw===null?createProfile():validateProfile(JSON.parse(raw));},
 save(profile){validateProfile(profile);storage.setItem(STORAGE_KEY,JSON.stringify(profile));},
 saveSettings(settings){
  const raw=storage.getItem(STORAGE_KEY),saved=raw===null?createProfile():validateProfile(JSON.parse(raw));
  if(!unlockedPetIds(saved.meta).includes(settings.activePetId))throw new Error('해금되지 않은 펫은 선택할 수 없습니다.');
  saved.settings={...(saved.settings??{}),activePetId:settings.activePetId};
  storage.setItem(STORAGE_KEY,JSON.stringify(saved));
 }
};}
