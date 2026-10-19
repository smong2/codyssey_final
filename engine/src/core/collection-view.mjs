// Engine presentation DTO, not a backend API schema or an award engine.
const A=[1,5,10,20,40,70,120,200],B=[1,3,5,10,20,35,50,80];
const groups=[
 ['forest','탐험과 발견','탐험','badge_frame_forest_dewdrop_000.png',[
  ['오늘도 탐험!','모험 누적 횟수',A,'adventures','forest_compass_005'],['보물 찾았다!','특별 발견 누적 횟수',B,'specialItemDiscoveries','forest_treasure_006'],['여기 뭐가 있지?','장소·조사 포인트 발견',[1,3,5,10,20,30,50,80],'locationsDiscovered','forest_door_007'],['궁금한 건 못 참아','호기심 태그 행동·선택',B,'tags.curiosity','forest_curiosity_008'],['펫과 함께','해금한 펫 수',[2,3,4,5,6,7,8,10],null,'forest_pet_009']]],
 ['star','배움과 성장','지식','badge_frame_star_crescent_001.png',[
  ['과학은 재미있어!','지식 계열 수업',A,'classesByStat.knowledge','star_science_010'],['말이 술술','표현력 계열 수업',A,'classesByStat.expression','star_speech_011'],['차근차근 생각해','신중함 태그 행동·선택',B,'tags.prudence','star_thinking_012'],['혼자서도 척척','독립성 태그 행동·선택',B,'tags.independence','star_independence_013'],['다시 도전!','실패 후 다른 일정에서 같은 게임 재도전',[1,2,3,5,8,12,20,30],'retries','star_retry_014']]],
 ['workshop','활동과 성취','솜씨','badge_frame_workshop_cobalt_002.png',[
  ['몸이 먼저!','솜씨 계열 수업',A,'classesByStat.dexterity','workshop_activity_015'],['미니게임 챔피언','미니게임 클리어',A,'minigamesCleared','workshop_champion_016'],['퍼즐 조각 착착','보유 마이룸 퍼즐 조각',[1,3,5,10,15,20,28,36],null,'workshop_puzzle_017'],['마이룸이 좋아','마이룸을 연 주의 누적 수',A,'roomWeeks','workshop_room_018'],['약속은 지켜야지','책임 태그 행동·선택',B,'tags.responsibility','workshop_promise_019']]],
 ['friendship','관계와 공감','표현력','badge_frame_friendship_pearl_003.png',[
  ['친구가 생겼어','NPC 누적 만남',A,'npcMeetings','friendship_friends_020'],['끝까지 들어볼게','완료한 NPC 개별 스토리',[1,2,3,5,8,12,16,20],'npcStoriesCompleted','friendship_listening_021'],['마음을 알아줘','공감 태그 행동·선택',B,'tags.empathy','friendship_empathy_022'],['같이 하면 쉬워','협력 태그 행동·선택',B,'tags.cooperation','friendship_cooperation_023'],['솔직하게 말해봐','솔직함 태그 행동·선택',B,'tags.honesty','friendship_honesty_024']]],
 ['rune','각성과 선택','마법','badge_frame_rune_obsidian_004.png',[
  ['룬이 반짝!','마법 계열 수업',A,'classesByStat.magic','rune_awaken_025'],['선택의 순간','중요 선택',B,'importantChoices','rune_choice_026'],['용기 한 스푼','용기 태그 행동·선택',B,'tags.courage','rune_courage_027'],['새로운 얼굴!','해금한 플레이 가능 캐릭터',[7,8,10,12,16,20,25,32],null,'rune_character_028'],['또 다른 미래','서로 다른 정규 직업 엔딩',[1,2,3,4,5,6,8,10],null,'rune_future_029']]]
];
export const BADGE_GROUPS=groups.map(([id,title,stat,frame,subgroups])=>({id,title,stat,frame,subgroups:subgroups.map(([title,condition,thresholds,counter,symbol])=>({title,condition,thresholds,counter,symbol:'badge_symbol_'+symbol+'.png'}))}));
const count=value=>Number.isSafeInteger(value)&&value>=0?value:null;
export function badgeProgress(meta,group,subgroup){
 const rows=meta.collectionView?.badges;if(rows!==undefined&&!Array.isArray(rows))throw new Error('배지 진행 정보를 읽지 못했습니다.');
 const data=rows?.find(row=>row?.categoryId===group.id&&row.subcategoryTitle===subgroup.title);
 let current=count(data?.current);
 // Legacy preview counters have no badge adjudication provenance; do not present them as received badge progress.
 if(current===null&&subgroup.symbol==='badge_symbol_forest_pet_009.png'&&Array.isArray(meta.unlockedPetIds))current=new Set(meta.unlockedPetIds).size;
 if(current===null&&subgroup.symbol==='badge_symbol_rune_character_028.png'&&Array.isArray(meta.unlockedCharacters))current=new Set(meta.unlockedCharacters).size;
 if(current===null&&subgroup.symbol==='badge_symbol_workshop_puzzle_017.png'){
  if(Array.isArray(meta.collectionView?.rooms))current=['room-1','room-2','room-3'].reduce((sum,id)=>sum+roomProgress(meta,id).pieces.length,0);
  else if(Array.isArray(meta.roomPieces)&&meta.roomPieces.length===0)current=0;
 }
 const earned=data?.earnedTiers;
 if(earned!==undefined&&(!Array.isArray(earned)||new Set(earned).size!==earned.length||earned.some(tier=>!Number.isInteger(tier)||tier<1||tier>8)))throw new Error('배지 진행 정보를 읽지 못했습니다.');
 if(data?.awardedMilestones!==undefined&&(!Array.isArray(data.awardedMilestones)||new Set(data.awardedMilestones).size!==data.awardedMilestones.length||data.awardedMilestones.some(tier=>![2,5,8].includes(tier))))throw new Error('배지 보상 정보를 읽지 못했습니다.');
 return {current,earned:earned??(meta.badges?.length?null:[]),awardedMilestones:data?.awardedMilestones??[]};
}
const DEFAULT_IMAGES={day:'BG11_myroom2_day_1920x1080_023.png',sunset:'BG11_myroom2_sunset_1920x1080_024.png',night:'BG11_myroom2_night_1920x1080_025.png'};
// PZ01/02/03 map to cosmos/princess/botanical in asset/puzzle/README.md.
export const ROOM_BACKGROUNDS=[{id:'default',title:'기본 기숙사방',images:DEFAULT_IMAGES},...[
 ['4_cosmos','우주방','PZ01_우주방'],['5_princess','공주방','PZ02_공주방'],['6_botanical','식물방','PZ03_식물방']
].map(([file,theme,puzzlePrefix],i)=>({id:'room-'+(i+1),title:'기숙사방 '+(i+1),theme,puzzlePrefix,images:Object.fromEntries(['day','sunset','night'].map(time=>[time,`BG11_myroom${file}_${time}.png`]))}))];
export function roomProgress(meta,id){
 const master=ROOM_BACKGROUNDS.find(room=>room.id===id);if(!master)throw new Error('등록되지 않은 마이룸 배경입니다.');
 const rows=meta.collectionView?.rooms;if(rows!==undefined&&!Array.isArray(rows))throw new Error('배경 퍼즐 정보를 읽지 못했습니다.');
 const data=rows?.find(room=>room?.id===id),pieces=data?.pieces??[];
 if(!Array.isArray(pieces)||new Set(pieces).size!==pieces.length||pieces.some(index=>!Number.isInteger(index)||index<0||index>11))throw new Error('배경 퍼즐 정보를 읽지 못했습니다.');
 const images=data?.images??master.images;
 if(images&&(!images.day||Object.values(images).some(value=>!/^BG\d+_[\w.-]+\.png$/.test(value))))throw new Error('배경 이미지 경로가 올바르지 않습니다.');
 return {...master,pieces,images,puzzlePrefix:images?.day===master.images?.day?master.puzzlePrefix:null,unlocked:id==='default'||data?.unlocked===true,mapped:!!images};
}
export function roomPieceImage(room,index){
 if(!Number.isInteger(index)||index<0||index>11)throw new Error('등록되지 않은 퍼즐 조각입니다.');
 return room.puzzlePrefix&&room.pieces.includes(index)?`./design-assets/puzzle/${room.puzzlePrefix}_${String(index+1).padStart(2,'0')}.png`:null;
}
export function badgeConditionText(sub,target){
 const tagNames={curiosity:'호기심 어린',prudence:'신중한',independence:'스스로 선택하는',responsibility:'책임감 있는',empathy:'공감하는',cooperation:'함께 힘을 모으는',honesty:'솔직한',courage:'용기 있는'};
 const tag=sub.counter?.startsWith('tags.')?tagNames[sub.counter.slice(5)]:null;
 if(tag)return `${tag} 행동·선택 ${target}번 해보기`;
 if(sub.symbol==='badge_symbol_forest_pet_009.png')return `펫 ${target}마리 해금하기`;
 if(sub.symbol==='badge_symbol_rune_character_028.png')return `학생 ${target}명 해금하기`;
 if(sub.symbol==='badge_symbol_workshop_puzzle_017.png')return `마이룸 퍼즐 ${target}조각 모으기`;
 if(sub.symbol==='badge_symbol_rune_future_029.png')return `서로 다른 정규 직업 엔딩 ${target}개 만나기`;
 const labels={adventures:`모험 ${target}번 떠나기`,specialItemDiscoveries:`특별한 발견물 ${target}번 찾기`,locationsDiscovered:`장소·조사 포인트 ${target}번 발견하기`,retries:`실패한 미니게임에 다른 일정에서 ${target}번 다시 도전하기`,minigamesCleared:`미니게임 ${target}번 클리어하기`,roomWeeks:`마이룸을 연 주 ${target}주 모으기`,npcMeetings:`친구 ${target}번 만나기`,npcStoriesCompleted:`친구의 이야기 ${target}개 끝까지 듣기`,importantChoices:`중요한 선택 ${target}번 경험하기`};
 return labels[sub.counter]??`${sub.condition} ${target}${sub.counter?.startsWith('classesByStat.')?'회':'개'} 달성하기`;
}
export function activeRoom(profile,time='day'){
 let room;try{room=roomProgress(profile.meta,profile.settings?.activeRoomBackgroundId??'default');}catch{room=roomProgress(profile.meta,'default');}
 if(!room.unlocked||!room.images)room=roomProgress(profile.meta,'default');
 return {...room,image:room.images[time]??room.images.day};
}
