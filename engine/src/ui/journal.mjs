import {classOf} from '../core/classes.mjs';
import {createPageTurnGate} from '../core/ui-flow.mjs';
import {studentCards,petCards} from '../core/catalogue.mjs';
import {BADGE_PREVIEWS} from '../core/bag-assets.mjs';
import {appendCharacterInfo} from './character-info.mjs';
import {weeklyActivityRecords} from '../core/activity-history.mjs';
import {activityResultText} from '../core/activity-rules.mjs';
import {ADVENTURE_LOCATIONS,getAdventureMap} from '../core/adventure-mission.mjs';
import {storyContent} from '../core/story-events.mjs';
const ACTIVITY_PLACES={'rune-circuit':'BG09_magic_workshop_1920x1080_018.png',excavation:'BG01_arcadia_entrance_and_lake_1920x1080_010.png','rune-link':'BG05_grand_library_1920x1080_014.png','training-guardian':'BG10_rune_training_ground_1920x1080_019.png','rune-merge':'BG07_glass_greenhouse_1920x1080_016.png','mirror-magic':'BG06_starlight_observatory_1920x1080_015.png','seal-dismantle':'BG02_clocktower_plaza_1920x1080_011.png'};
export const activityArt=(a,locationId='greenhouse')=>a==='adventure'?getAdventureMap((ADVENTURE_LOCATIONS.find(place=>place.id===locationId)??ADVENTURE_LOCATIONS[0]).mapId).thumbnail:a==='rest'?'./world-assets/BG03_myroom2_day_1920x1080_023.png':ACTIVITY_PLACES[classOf(a)?.id]?'./world-assets/'+ACTIVITY_PLACES[classOf(a).id]:null;
export const activityLabel=(a,locationId='greenhouse')=>a==='adventure'?(ADVENTURE_LOCATIONS.find(place=>place.id===locationId)?.title??'모험')+' 모험':classOf(a)?.title??'휴식';
export function createJournalUI(ctx){
 const {el,btn,shell,heading,current,meta,onReturn,turnPage,modal}=ctx;
 let diaryTab='활동 기록',page=0,selected=0;const turns=createPageTurnGate();
 const close=()=>{const x=btn('X',onReturn,'close-x');x.setAttribute('aria-label','마이룸으로 닫기');shell.append(x);};
 function diary(){
  turns.reset();heading('다이어리','diary-page');const records=diaryTab==='활동 기록'?weeklyActivityRecords(current().actionHistory??[]):[...(current().storyState?.history??[])].reverse(),pages=Math.max(1,Math.ceil(records.length/6));page=Math.min(page,pages-1);
  const layout=el('div',null,'book-layout'),tabs=el('nav',null,'book-tabs');
  const change=fn=>{const done=turns.begin(()=>{if(!layout.isConnected)return;fn();diary();});if(done)turnPage(layout,done);};
  for(const tab of ['이야기','활동 기록'])tabs.append(btn(tab,()=>change(()=>{diaryTab=tab;page=0;selected=0;}),diaryTab===tab?'selected':'quiet'));
  const left=el('section',null,'book-page book-left'),right=el('section',null,'book-page book-right');left.append(shell.querySelector('h1'),el('h2',diaryTab));
  const grid=el('div',null,'scrap-cards');if(!records.length)grid.append(el('p',diaryTab==='이야기'?'아직 등록된 이야기 기록이 없습니다.':'아직 완료한 활동이 없습니다.','book-empty'));
  for(const [index,record] of records.slice(page*6,page*6+6).entries()){
   const absolute=page*6+index,card=btn('',()=>change(()=>{selected=absolute;}),'scrap-card'+(selected===absolute?' selected':''));
   const images=el('div',null,'weekly-record-images'),arts=record.activities?record.activities.map(a=>activityArt(a.action,a.locationId)):[activityArt('adventure',record.locationId)];for(const art of [...new Set(arts.filter(Boolean))].slice(0,3)){const image=el('img');image.src=art;image.alt='';images.append(image);}if(images.children.length)card.append(images);
   card.append(el('strong',record.activities?record.week+'주차':storyContent(record).title),el('small',record.activities?'실제 활동 '+record.activities.length+' / 5회':record.week+'주차 · 임시 이야기'));grid.append(card);
  }left.append(grid);
  const record=records[selected];right.append(el('h2',record?(record.activities?record.week+'주차 활동 기록':storyContent(record).title):'이야기의 자리'));
  if(record?.activities){for(const activity of record.activities){const row=el('p',['월','화','수','목','금'][activity.day]+'요일 · '+activityLabel(activity.action,activity.locationId)),result=activityResultText(activity);if(result)row.append(el('br'),el('small',result));right.append(row);}right.append(el('small','완료한 활동만 표시합니다. 활동 결과 저장 후 유지됩니다. 개인 돌아보기 문구는 아직 등록되지 않았습니다.'));}
  else if(record){const content=storyContent(record),choice=content.choices.find(c=>c.id===record.choiceId);right.append(el('p',record.week+'주차 · '+['월','화','수','목','금'][record.day]+'요일'),el('p',choice?.label??''),el('p',content.closing),el('small','연결 확인용 임시 이야기 기록 · 정식 스토리·해금 아님'));}
  else right.append(el('p','선택한 기록의 사진과 메모가 이 페이지에 표시됩니다.'),el('p','시나리오·개인 기록 데이터 미등록'),el('small','책·테이프·장식 전용 애셋은 제작 예정입니다.'));
  const spine=el('div',null,'book-spine');spine.setAttribute('aria-hidden','true');layout.append(tabs,left,spine,right);shell.append(layout);
  const footer=el('nav',null,'book-footer');const previous=btn('이전 페이지',()=>change(()=>{page--;selected=page*6;}),'quiet'),next=btn('다음 페이지',()=>change(()=>{page++;selected=page*6;}),'quiet');previous.disabled=page===0;next.disabled=page+1>=pages;
  footer.append(previous,el('span',(page+1)+' / '+pages),next);shell.append(footer);close();
 }
 function bag(tab='마이룸'){
  heading('가방','bag-page');const panel=el('section',null,'paper bag-frame'),tabs=el('nav',null,'actions');for(const label of ['마이룸','배지','펫','캐릭터']){const b=btn(label,()=>bag(label),label===tab?'selected':'quiet');b.setAttribute('aria-pressed',String(label===tab));tabs.append(b);}panel.append(shell.querySelector('h1'),tabs);shell.append(panel);close();
  const grid=el('div',null,'bag-card-grid'+(['캐릭터','펫'].includes(tab)?' silhouette-card-grid':''));
  const records=tab==='배지'?(meta().badges??[]):[];
  if(tab==='캐릭터'||tab==='펫'){
   const entries=tab==='캐릭터'?studentCards(meta(),'bag'):petCards(meta(),ctx.activePet().id);
   for(const c of entries){
    const kind=tab==='캐릭터'?'캐릭터':'펫',locked=!c.unlocked;
    const card=btn('',()=>{
     if(locked){
      const body=el('div',null,'collection-unlock-info');
      body.append(el('p',kind==='캐릭터'?'아직 만날 수 없는 학생이에요.':'아직 함께할 수 없는 펫이에요.'),el('h3','해금 조건'),el('p',c.unlockHint??c.condition??'해금 정보가 아직 등록되지 않았어요.'));
      if(kind==='캐릭터')body.append(el('p','조건 달성은 현재 회차에 기록되고, 회차 종료가 확정되면 다음 회차부터 사용할 수 있어요.'));
      body.append(el('small','조건 안내용 화면입니다. 자동 해금 판정은 아직 연결되지 않았습니다.'));
      modal?.('해금 안내',body);
      return;
     }
     let body,actions=[],dialog;
     if(kind==='캐릭터'){body=el('section',null,'collection-character-info');appendCharacterInfo(body,c,el);}
     else{
      body=el('section',null,'collection-pet-info');
      const names={knowledge:'지식',expression:'표현력',dexterity:'솜씨',exploration:'탐험',magic:'마법'};
      body.append(el('h2',c.name),el('p',c.description),el('h3','함께하는 효과'),el('p',Object.entries(c.modifiers).map(([key,value])=>names[key]+' +'+value).join(' · ')));
      if(c.selected)body.append(el('small','현재 함께하는 펫입니다.'));
      else if(ctx.onSelectPet){const choose=btn('함께하기',()=>{if(ctx.onSelectPet(c.id)){dialog?.close?.();bag('펫');}});choose.disabled=ctx.isSaveFailed?.()??false;actions.push(choose);}
     }
     dialog=modal?.(kind+' 정보',body,actions);
    },'collection-item-card collection-card-trigger silhouette-collection-card'+(locked?' locked-card':'')+(c.selected?' active-collection-card':''));
    card.setAttribute('type','button');card.setAttribute('aria-label',locked?'미해금 '+kind+' 해금 방법 보기':'해금된 '+kind+' 정보 보기');
    const image=el('img',null,'bag-portrait');image.src=tab==='캐릭터'?'./character-assets/'+c.fullbody:'./design-assets/bern/'+c.image;image.alt='';image.setAttribute('aria-hidden','true');card.append(image);
    if(locked){const lock=el('span','🔒','collection-lock');lock.setAttribute('aria-hidden','true');card.append(lock);}
    grid.append(card);
   }
  }else if(tab==='마이룸'){
   const card=el('article',null,'collection-item-card');const art=el('img',null,'bag-room-image');art.src='./world-assets/BG03_myroom2_day_1920x1080_023.png';art.alt='현재 기본 마이룸2';card.append(art,el('h3','기본 기숙사방 · 마이룸2'),el('p','현재 사용 중'));grid.append(card);const pending=el('article',null,'collection-item-card');pending.append(el('h3','마이룸 배경 퍼즐'),el('p','보유 조각 '+(meta().roomPieces??[]).length+'개'),el('small','배경별 조각 연결·완성 보상 미등록'));grid.append(pending);
  }else{
  if(!records.length){const empty=el('article',null,'collection-item-card empty-item');empty.append(el('div','◇','item-image-slot'),el('h2','획득한 배지 없음'),el('p','수집품 이미지·이름·설명 연결 자리'));grid.append(empty);}
  for(const id of records){const card=el('article',null,'collection-item-card');card.append(el('div','◇','item-image-slot'),el('h2',String(id)),el('p','보유한 수집 배지 · 상세 자원 연결 예정'));grid.append(card);}
  if(tab==='배지'){const reward=el('article',null,'collection-item-card');reward.append(el('h3','카테고리 완성 보상'),el('p','캐릭터 · 펫 · 마이룸 배경 퍼즐'),el('small','조건·진행도 연결 예정 · 임의 해금 없음'));grid.append(reward);}
  }
  if(tab==='배지'){
   const owned=el('section',null,'bag-owned');owned.append(el('h2','실제 보유'),grid);panel.append(owned);
   const previews=el('section',null,'bag-preview-section'),samples=el('div',null,'bag-card-grid');previews.append(el('h2','디자인 시안 · 보유 목록 아님'),el('p','획득 조건과 보유 데이터 미등록 · 아래 이미지는 자원 확인용입니다.'));
   {
    const locked=el('article',null,'collection-item-card'),lock=el('img',null,'bag-portrait');lock.src='./design-assets/badge/badge_state_locked_038.png';lock.alt='미획득 배지 공용 잠금';locked.append(lock,el('h3','미획득 표시'),el('small','공용 잠금 · 표시 시안'));samples.append(locked);
    for(const [name,frame,symbol]of BADGE_PREVIEWS){const card=el('article',null,'collection-item-card'),layers=el('div',null,'badge-layer-stack');for(const file of [frame,symbol,'badge_ornament_star_030.png']){const image=el('img');image.src='./design-assets/badge/'+file;image.alt='';layers.append(image);}layers.setAttribute('role','img');layers.setAttribute('aria-label',name+' 배지 조합 시안');card.append(layers,el('h3',name),el('small','조합 시안 · 미보유'));samples.append(card);}
   }previews.append(samples);panel.append(previews);
  }else panel.append(grid);
 }
 return {diary,bag};
}
