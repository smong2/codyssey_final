import {lowStamina} from './activity-rules.mjs';
const definitions=[
 ['PT01_owl.png','에든','대서고의 높은 창가를 좋아하는 작은 부엉이. 새로운 걸 알게 되면 가만히 듣고 있다가, 네가 그 이야기를 꺼낼 때 조용히 고개를 끄덕여 준다.','knowledge',5,'expression',3,'기본 제공'],
 ['PT02_fox.png','루엔','희미한 룬빛을 따라다니는 여우. 낯선 마법을 만나면 서두르지 않고 주변을 한 바퀴 돌며 원리와 흔적부터 살펴본다.','knowledge',5,'magic',3,'첫 직업 엔딩 확인'],
 ['PT03_rabbit.png','포포','리본과 작은 도구를 좋아하는 토끼. 떠오른 생각이 있으면 가만히 두기보다 손으로 금세 만들어 보여 주는 걸 좋아한다.','expression',5,'dexterity',3,'캐릭터 총 10명 해금'],
 ['PT04_otter.png','마린','아르카디아의 호숫가와 물길을 좋아하는 수달. 새로운 길을 찾으면 먼저 달려가 신나게 손짓하며 발견한 것을 함께 보자고 한다.','expression',5,'exploration',3,'모험 누적 100회'],
 ['PT05_puppy.png','토비','마도 공방 근처를 자주 맴도는 강아지. 작은 소리와 냄새를 잘 기억해 흩어진 부품이나 지나친 단서를 곧잘 찾아낸다.','dexterity',5,'knowledge',3,'NPC 개별 스토리 5개 완료'],
 ['PT06_cat.png','니브','룬빛이 비치면 앞발로 살짝 건드려 보는 고양이. 작은 장치와 마법 도구를 다룰 때는 장난기 많은 모습과 달리 꽤나 침착하다.','dexterity',5,'magic',3,'서로 다른 직업 엔딩 3개 확인'],
 ['PT07_red_panda.png','로코','나무와 난간을 잘 타는 레서판다. 낯선 곳에서도 가볍게 움직이며 손 닿는 곳을 하나씩 살펴보는 것을 좋아한다.','exploration',5,'dexterity',3,'캐릭터 총 18명 해금'],
 ['PT08_squirrel.png','피핀','작은 주머니에 발견한 것을 차곡차곡 모으는 다람쥐. 어디서 무엇을 보았는지 잘 기억해 다음 탐험에서 든든한 길잡이가 되어 준다.','exploration',5,'knowledge',5,'배지 소분류 1개 8/8 완성'],
 ['PT09_hedgehog.png','브램','기분이 들뜨면 가시 끝에 작은 룬빛이 번지는 고슴도치. 말로 다 하지 못한 마음도 빛과 몸짓으로 또렷하게 보여 준다.','magic',5,'expression',5,'수업 150회 + 모험 150회 + NPC 만남 30회'],
 ['PT10_fawn.png','세렌','숲과 별빛 사이에 남은 희미한 룬의 흔적을 알아보는 아기사슴. 낯선 길에서도 조용히 앞을 살피며 새로운 곳으로 발을 내딛는다.','magic',5,'exploration',5,'캐릭터 총 25명 해금']
];
export const PETS=definitions.map(([image,name,description,a,av,b,bv,condition],i)=>({id:'PET'+String(i+1).padStart(2,'0'),image,name,description,modifiers:{[a]:av,[b]:bv},condition}));
export function unlockedPetIds(meta){
 const ids=[...(Array.isArray(meta.unlockedPetIds)?meta.unlockedPetIds:[]),...(Array.isArray(meta.pets)?meta.pets:[]).map(id=>/^pet\d+$/.test(id)?'PET'+id.slice(3).padStart(2,'0'):id),'PET01'];
 return PETS.filter(p=>ids.includes(p.id)).map(p=>p.id);
}
export function activePet(profile){
 const id=profile.settings?.activePetId;
 return PETS.find(p=>p.id===id&&unlockedPetIds(profile.meta).includes(id))??PETS[0];
}
export function effectiveStats(stats,pet,stamina=100){
 return Object.fromEntries(Object.entries(stats).map(([key,value])=>{
  const corrected=Math.max(0,Math.min(500,value+(pet.modifiers[key]??0)));
  return [key,lowStamina(stamina)?Math.floor(corrected*0.70):corrected];
 }));
}
export function petCards(meta,activeId='PET01'){return PETS.map(p=>({...p,unlocked:unlockedPetIds(meta).includes(p.id),muted:!unlockedPetIds(meta).includes(p.id),selected:p.id===activeId}));}
