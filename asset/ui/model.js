'use strict';
const unlocked=['CH01','CH15','CH31','CH02','CH08','CH16'];
const portraits={CH01:'kael',CH15:'robin',CH31:'nico',CH02:'sera',CH08:'iris',CH16:'tia'};
const statNames=['지식','표현력','솜씨','탐험','마법'];
const badgeGroups=[
 {id:'forest',name:'탐험과 발견',stat:'탐험',frame:'badge_frame_forest_dewdrop_000',subs:['오늘도 탐험!','보물 찾았다!','여기 뭐가 있지?','궁금한 건 못 참아','펫과 함께'],symbols:['compass_005','treasure_006','door_007','curiosity_008','pet_009'],counts:[5,2,1,2,0]},
 {id:'star',name:'배움과 성장',stat:'지식',frame:'badge_frame_star_crescent_001',subs:['과학은 재미있어!','말이 술술','차근차근 생각해','혼자서도 척척','다시 도전!'],symbols:['science_010','speech_011','thinking_012','independence_013','retry_014'],counts:[2,1,2,0,1]},
 {id:'workshop',name:'활동과 성취',stat:'솜씨',frame:'badge_frame_workshop_cobalt_002',subs:['몸이 먼저!','미니게임 챔피언','퍼즐 조각 착착','마이룸이 좋아','약속은 지켜야지'],symbols:['activity_015','champion_016','puzzle_017','room_018','promise_019'],counts:[1,2,1,2,1]},
 {id:'friendship',name:'관계와 공감',stat:'표현력',frame:'badge_frame_friendship_pearl_003',subs:['친구가 생겼어','끝까지 들어볼게','마음을 알아줘','같이 하면 쉬워','솔직하게 말해봐'],symbols:['friends_020','listening_021','empathy_022','cooperation_023','honesty_024'],counts:[2,0,2,1,1]},
 {id:'rune',name:'각성과 선택',stat:'마법',frame:'badge_frame_rune_obsidian_004',subs:['룬이 반짝!','선택의 순간','용기 한 스푼','새로운 얼굴!','또 다른 미래'],symbols:['awaken_025','choice_026','courage_027','character_028','future_029'],counts:[2,1,1,0,0]}
];
const bonusFor=counts=>counts.reduce((a,n)=>a+[2,5,8].filter(t=>n>=t).length,0);
const effective=(saved,pet,stamina)=>saved.map((n,i)=>{const adjusted=Math.min(500,Math.max(0,n+(pet[i]||0)));return stamina>=10&&stamina<=30?Math.floor(adjusted*.7):adjusted;});
const visibleRoster=gender=>[...roster].sort((a,b)=>Number(unlocked.includes(b.id))-Number(unlocked.includes(a.id))||a.id.localeCompare(b.id)).filter(c=>gender==='all'||c.gender===gender);
