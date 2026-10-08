const stage=document.querySelector('#stage'),picker=document.querySelector('#scene');
const base='../',assets={player:'01_characters/01_images/01_CH01_카엘.png',npc:'01_characters/01_images/20_CH20_하젤.png',bern:'01_characters/01_images/35_NPC03_베른_v4.png',sd:'08_sd_character/00_images/00_SD03_frames/14_SD03_S_01.png',herb:'07_adventure_objects/00_images/04_OBJ03_달빛_약초.png',wilt:'07_adventure_objects/00_images/01_OBJ01_조사_식물_시듦.png',plant:'07_adventure_objects/00_images/03_OBJ02_조사_식물_회복_v2.png',rune:'07_adventure_objects/00_images/05_OBJ04_사건_룬_비활성.png',active:'07_adventure_objects/00_images/06_OBJ05_사건_룬_활성.png'};
const img=(src,cls='',alt='',style='')=>`<img src="${lumiaAssetPath(src)}" class="${cls}" alt="${alt}" style="${style}">`;
const asset=(key,cls='',style='')=>img(base+assets[key],cls,key,style);
const bg=n=>img(base+`03_backgrounds/01_exports/${n}_1920x1080.png`,'backdrop');
const button=(label,target,cls='primary')=>`<button class="${cls}" data-go="${target}">${label}</button>`;
const scenes=[
 ['타이틀','title','시작 버튼이 분명한가? 배경·브랜드·버튼이 서로 경쟁하지 않는가?'],
 ['캐릭터 선택','select','기존 선택 화면 재사용. 대표 플레이는 카엘로 고정한 시안이다.'],
 ['입학 초대장','admission','선택한 인물 이름을 확인하고 입학한다. 초대장 글자는 분리된 UI 텍스트다.'],
 ['시계탑 광장 · 사건 안내','plaza','Life 좌 플레이어 / 우 상대 / 하단 대화. 하젤은 검토용 안내 배역이다.'],
 ['온실 Life · 탐험 선택','greenhouse','대화 뒤 명시적인 진입 선택. 장소의 큰 인물 화면에서 탐험으로 이동한다.'],
 ['Adventure · 입구','entrance','넓은 세계의 입구 일부만 보인다. 목표와 가방을 익힌다.'],
 ['회랑 이동','walk','입구에서 이동한 다음 카메라 구간. 진행할 길이 읽혀야 한다.'],
 ['시든 식물 발견','inspect','대상 가까이에서 살펴보기. 누르기 전 수집 보상은 없다.'],
 ['조사 결과 · 발견 기록','knowledge','관찰 내용은 발견 기록에 담고 수집품과 구분한다.'],
 ['달빛 약초 발견','herb','다른 구역에서 채집 대상을 만난다. 처음 대상과 구별되는 행동이다.'],
 ['약초 획득','pickup','채집 대상 제거·획득 알림·가방 수량 1. 이 장면에서 채집을 반복하지 않는다.'],
 ['백팩 확인','inventory','아이템 슬롯·수량·선택 정보. 기록은 아이템 슬롯에 섞지 않는다.'],
 ['안쪽 단서 구역','clues','다음 카메라 구간. 조사 결과를 바탕으로 사건 중심부로 향한다.'],
 ['어두워진 룬 발견','encounter','룬과 주변 식물을 관찰한다. 큰 Life 인물이나 대화창은 없다.'],
 ['룬 연결 퍼즐','puzzle','현장을 남겨두고 퍼즐 패널을 띄운다. 3×3은 시험용 구성이다.'],
 ['퍼즐 힌트','hint','같은 퍼즐 위 단계적 힌트. 정답 전체를 즉시 노출하지 않는다.'],
 ['룬 활성화 · 식물 회복','change','같은 카메라와 대상 위치에서 상태만 바뀐다. 기존 Object State를 재사용한다.'],
 ['온실 Life 복귀','return','큰 인물과 변화된 대화로 복귀. 좌우 인물 자리는 유지한다.'],
 ['이야기 선택','choice','선택지 뒤 응답을 확인한다. 선택을 도덕 점수로 표시하지 않는다.'],
 ['마이룸 · 베른','room','가구가 후경으로 물러난 방. 왼쪽 카엘 / 오른쪽 작은 베른 / 하단 대화.'],
 ['마음 돌아보기','reflection','베른의 지지 뒤 자기 경험을 돌아본다. 대답과 관계없이 기록할 수 있다.'],
 ['마음 기록','record','관찰·수집·대화 선택·회고를 경험 카드로 확인한다. 점수와 성격 판정 없음.']
];
let index=Math.max(0,Math.min(21,(parseInt(location.hash.slice(1),10)||1)-1)),choice='먼저 무슨 일이 있었는지 듣는다',reflection='천천히 살펴보니 단서를 찾을 수 있었어',puzzleRotations=Array(9).fill(0);
const labels=['UI08_가방','UI09_발견기록','UI10_힌트'];
function fit(){const width=Math.min(innerWidth,document.body.classList.contains('capture')?1920:1440);document.querySelector('#frame').style.width=width+'px';document.querySelector('#frame').style.height=width*9/16+'px';stage.style.transform=`scale(${width/1920})`}
function life(where,speaker,line,next,npc='npc'){
 let html=where==='room'&&scenes[index][1]==='room'?roomBackground():where==='room'?img('../assets/screen_images/LIFE01_myroom_side_dialogue_source_004.png','backdrop'):bg(where==='plaza'?'BG02_시계탑_광장':'BG07_유리_온실');
 html+=`<div class="location">${where==='plaza'?'시계탑 광장':where==='room'?'마이룸':'유리 온실'}</div><div class="mode">Life · 대화</div>`+asset('player','person player')+asset(npc,'person npc '+(npc==='bern'?'bern':''));
 html+=`<div class="nameplate left-name">카엘</div><div class="nameplate right-name">${npc==='bern'?'베른':'하젤'}</div><section class="dialogue paper"><div class="speaker">${speaker}</div><p>${line}</p>${button(next===5?'약초원을 살펴본다':next===20?'오늘을 돌아보기':'다음',next,'primary advance')}</section>`;
 return html;
}
const roomPlans=[
 {name:'중앙 기록 테이블',desk:[880,345,610,610],chair:[990,210,230,470],diary:[1060,430,155,160],bag:[1240,470,150,175]},
 {name:'창가 작업대',desk:[900,295,560,560],chair:[985,140,230,470],diary:[1090,390,150,155],bag:[970,625,150,165]},
 {name:'서가 연결형',desk:[1050,415,430,430],chair:[1030,275,190,360],diary:[1150,490,135,140],bag:[960,625,150,160],shelf:[910,230,250,425]},
 {name:'전경 작업대',desk:[930,520,550,550],chair:[1000,320,220,410],diary:[1030,570,165,165],bag:[1240,590,155,180]},
 {name:'기록·수집 분리형',desk:[920,330,440,440],chair:[1130,225,220,440],diary:[1010,405,150,155],bag:[1220,600,160,175],shelf:[875,220,235,380]}
];
const roomPlanIndex=Math.max(0,Math.min(4,(parseInt(new URLSearchParams(location.search).get('room'),10)||1)-1));
function roomBackground(){
 const p=roomPlans[roomPlanIndex],items='../02_items/00_images/';
 const prop=(file,box,cls)=>img(items+file,'room-prop '+cls,cls,`left:${box[0]}px;top:${box[1]}px;width:${box[2]}px;height:${box[3]}px`);
 const affordance=(file,box,label,kind)=>`<button class="room-item ${kind}" data-room-item="${kind}" aria-label="${label} 열기" style="left:${box[0]}px;top:${box[1]}px;width:${box[2]}px;height:${box[3]}px">${img(file,'',label)}<span>${label}</span></button>`;
 return bg('BG03_빈_마이룸')+(p.shelf?prop('10_IT10_마이룸_책장.png',p.shelf,'shelf'):'')+prop('08_IT08_마이룸_의자.png',p.chair,'chair')+prop('07_IT07_마이룸_책상.png',p.desk,'desk')+affordance(items+'01_IT01_마음_일기.png',p.diary,'다이어리','diary')+affordance('../04_ui/00_images/06_UI08_가방.svg',p.bag,'수집가방','bag')+`<div class="room-plan-label">구도 ${roomPlanIndex+1} · ${p.name}</div>`;
}
// Camera crops are a storyboard surrogate, not runtime tile geometry. Shared crops retain place continuity.
const cameras={entrance:[0,2100],walk:[350,1500],inspect:[150,450],knowledge:[150,450],herb:[3700,2000],pickup:[3700,2000],inventory:[3700,2000],clues:[3100,700],encounter:[1900,0],puzzle:[1900,0],hint:[1900,0],change:[1900,0]};
function adventure(type){const [x,y]=cameras[type],hasItem=index>=10,hasRecord=index>=8;let html=img('../assets/screen_images/ADV01_expanded_exploration_map_source_003.png','world','온실 탐험 맵',`left:${-x}px;top:${-y}px`);
 const goal=index<8?'이상한 식물을 살펴보기':index<10?'달빛 약초를 찾아보기':index<13?'안쪽의 룬을 찾아보기':index<16?'룬의 빛을 연결하기':'온실로 돌아가기';
 const actorStyles=['inspect','knowledge'].includes(type)?'left:1310px;top:650px':['herb','pickup','inventory'].includes(type)?'left:840px;top:430px':['encounter','puzzle','hint','change'].includes(type)?'left:720px;top:340px':type==='clues'?'left:850px;top:630px':type==='walk'?'left:1250px;top:520px':'';
 html+=`<section class="objective paper"><small>온실 Adventure</small><h2>${goal}</h2><p>◇ ${hasRecord?'발견 기록 1':'주변을 천천히 둘러보세요'}</p></section><div class="mode">Adventure · 탐험</div>`+asset('sd','sd',actorStyles);
 html+=`<div class="tools">${labels.map((l,i)=>`<button data-tool="${i}">${img(base+'04_ui/00_images/'+l+'.svg','',l)}${['백팩','기록','힌트'][i]}${i===0?`<b class="badge">${hasItem?1:0}</b>`:''}</button>`).join('')}</div><div class="keyguide">이동 구간 시안 · 다음 화면으로 동선을 따라가 보세요</div>`;
 if(['inspect','knowledge'].includes(type))html+=asset('wilt','object','left:1480px;top:570px;width:180px;height:200px');
 if(type==='inspect')html+=`<div style="position:absolute;left:1390px;top:800px">${button('살펴보기',8)}</div>`;
 if(type==='herb')html+=asset('herb','object','left:1090px;top:540px;width:145px;height:165px')+button('채집하기',10,'interact');
 if(type==='pickup')html+=`<section class="toast paper">${asset('herb','', 'width:75px;height:75px;vertical-align:middle')} 달빛 약초 × 1 · 백팩에 담았어요</section>`+button('백팩 확인',11,'interact');
 if(['encounter','puzzle','hint','change'].includes(type)){html+=asset(type==='change'?'active':'rune','object '+(type==='change'?'glow':''),'left:970px;top:300px;width:225px;height:250px')+asset(type==='change'?'plant':'wilt','object','left:1260px;top:425px;width:180px;height:200px');if(type==='encounter')html+=button('룬 관찰하기',14,'interact')}
 if(type==='clues')html+=`<section class="toast paper">기록한 잎맥의 무늬와 같은 흔적이 보여요.</section>`+button('흔적을 따라간다',13,'interact');
 if(type==='change')html+=`<section class="toast paper">룬에 빛이 돌아오고, 잎이 다시 펼쳐졌어요.</section>`+button('온실로 돌아가기',17,'interact');
 return html;
}
function popup(title,body){stage.insertAdjacentHTML('beforeend',`<div class="overlay transient"><section class="modal paper"><h2>${title}</h2><button class="close" data-close>닫기 ×</button>${body}</section></div>`);stage.querySelector('[data-close]').onclick=()=>stage.querySelector('.transient').remove()}
function inventoryBody(count){return `<div class="inventory"><div class="slot">${count?asset('herb')+'<b>1</b>':''}</div><div class="slot"></div><div class="slot"></div><div class="detail"><h2>${count?'달빛 약초':'아직 수집품이 없어요'}</h2><p>${count?'온실 약초 구역에서 채집한 식물입니다.<br>보유 수량: 1':'탐험하며 얻은 아이템을 이곳에서 확인할 수 있어요.'}</p><small>수집품 · 발견 기록은 별도 메뉴</small></div></div>`}
function puzzle(hint=false){const shapes=['start','straight','elbow','elbow','straight','elbow','elbow','straight','goal'];return `<div class="overlay"><section class="modal paper puzzle"><h2>끊어진 빛을 연결해요</h2><div class="puzzle-body"><div class="grid">${shapes.map((s,i)=>`<button data-tile="${i}" aria-label="룬 조각 ${i+1} 회전">${img(base+`09_puzzle/00_images/PZ_${s}_inactive.svg`,'','룬 조각',`transform:rotate(${puzzleRotations[i]*90}deg)`)}</button>`).join('')}</div><div class="puzzle-notes"><p>조각을 눌러 회전해 보세요.<br>시작점에서 도착점까지 빛을 이어요.</p><p style="font-size:23px">검토용 보드 · 연결 판정은 아직 미연결</p><div class="action-row">${button('힌트 보기',15,'secondary')}</div><div class="action-row">${button('해결 후 화면 보기',16)}</div>${button('현장으로',13,'secondary')}</div></div></section>${hint?`<section class="hint paper"><h2>작은 힌트 · 1</h2><p>시작점 옆 조각부터 보세요.<br>빛이 나가는 방향과 이어지는 방향을 비교해 볼까요?</p>${button('퍼즐로 돌아가기',14,'secondary')}</section>`:''}</div>`}
function render(){const type=scenes[index][1];stage.className='scene-'+type;location.hash=String(index+1);picker.value=index;let html='';
 if(type==='title'||type==='select'){html=img(`00_images/${type==='title'?'01_SC02_게임_시작.jpg':'02_SC03_캐릭터_선택.jpg'}`,'flat',scenes[index][0]);html+=type==='title'?`<button class="hotspot" data-go="1" aria-label="새로운 이야기 시작"></button>`:`<button class="hotspot" style="left:1230px;top:912px;width:510px;height:68px" data-go="2" aria-label="카엘로 시작하기"></button>`}
 else if(type==='admission'){html=bg('BG01_아르카디아_입구와_호수')+`<section class="sheet invite">${img(base+'04_ui/00_images/05_UI07_입학_초대장.png')}<small>ARCADIA RUNE ACADEMY</small><h1>입학 초대장</h1><p><b>카엘 님께</b></p><p>아르카디아에서 시작될 새로운 이야기에<br>당신을 초대합니다.</p><p>친구들을 만나고, 궁금한 것을 살펴보며<br>당신의 마음이 향하는 길을 찾아보세요.</p><div class="action-row">${button('입학하기',3)}</div></section>`}
 else if(type==='plaza')html=life('plaza','하젤','온실의 식물들이 갑자기 시들고 있어요.<br>저와 함께 어떤 일이 있었는지 살펴봐 주실래요?',4);
 else if(type==='greenhouse')html=life('greenhouse','하젤','흙은 젖어 있는데 잎이 힘을 잃었어요.<br>약초원 안쪽에도 비슷한 흔적이 있는지 살펴봐 주세요.',5);
 else if(type==='return')html=life('greenhouse','하젤','빛이 돌아오니 잎도 다시 펼쳐졌어요.<br>급하게 물을 더 주기 전에 살펴봐 주셔서 고마워요.',18);
 else if(type==='choice'){html=life('greenhouse','하젤','혼자 해결해야 한다고 생각해서, 걱정을 말하지 못했어요.<br>다음에 이런 일이 생기면 어떻게 해 보면 좋을까요?',19);html+=`<div class="choicebox">${['먼저 무슨 일이 있었는지 듣는다','다음에는 함께 살펴보자고 한다'].map(c=>`<button data-choice="${c}">${c}</button>`).join('')}</div>`}
 else if(['room','reflection','record'].includes(type)){html=life('room','베른','돌아오셨군요, 주인님. 오늘도 애쓰셨습니다.<br>잠시 쉬면서 기억에 남은 순간을 이야기해 주시겠습니까?',20,'bern');if(type==='reflection')html+=`<section class="record paper"><h2>오늘, 어떤 순간이 남았나요?</h2>${['천천히 살펴보니 단서를 찾을 수 있었어','혼자 걱정하던 친구의 이야기를 들었어','아직 잘 모르겠어'].map(r=>`<button data-reflection="${r}" style="width:100%;margin:10px 0;text-align:left">${r}</button>`).join('')}</section>`;if(type==='record')html+=`<section class="record paper"><small>마음 기록 · 검토용 경험 카드</small><h2>빛을 잃은 온실</h2>${asset('plant')}${asset('active')}<p>관찰: 시든 잎에 남은 룬 흔적<br>수집: 달빛 약초 × 1</p><p>대화: ${choice}</p><p>내가 남긴 말:<br>“${reflection}”</p>${button('이야기 처음으로',0,'secondary')}</section>`}
 else {html=adventure(type);if(type==='knowledge')html+=`<div class="overlay"><section class="modal paper"><h2>발견 기록 · 시든 잎의 흔적</h2><p>흙은 젖어 있지만 잎은 시들어 있다.<br>잎맥에 희미한 룬 무늬가 남아 있다.</p><p>다른 식물과 룬 주변도 비교해 보자.</p><small>새로운 관찰 1 · 백팩 아이템이 아닙니다</small><div class="action-row">${button('기록하고 계속 탐험',9)}</div></section></div>`;if(type==='inventory')html+=`<div class="overlay"><section class="modal paper"><h2>내 백팩</h2>${inventoryBody(1)}<div class="action-row">${button('닫고 계속 탐험',12)}</div></section></div>`;if(type==='puzzle'||type==='hint')html+=puzzle(type==='hint')}
 stage.innerHTML=html+`<div class="review-tag">${String(index+1).padStart(2,'0')} / 22 · 화면 구성 시안</div>`;document.querySelector('#review').innerHTML=`<b>${String(index+1).padStart(2,'0')} · ${scenes[index][0]}</b><span class="caption">${scenes[index][2]}</span>`;document.querySelector('#prev').disabled=index===0;document.querySelector('#next').disabled=index===21;bind();fit();
}
function go(n){index=Math.max(0,Math.min(21,+n));render()}
function bind(){stage.querySelectorAll('[data-room-item]').forEach(b=>b.onclick=()=>b.dataset.roomItem==='bag'?popup('수집가방',inventoryBody(1)):popup('마음 다이어리','<p>오늘 탐험에서 기억에 남은 순간을 돌아봐요.<br>베른과 이야기를 나눈 뒤 마음 기록을 남길 수 있어요.</p>'));stage.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));stage.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{choice=b.dataset.choice;stage.querySelector('.choicebox').remove();stage.querySelector('.dialogue p').textContent=choice.startsWith('먼저')?'하젤: 제 이야기를 들어 주셔서 고마워요. 서두르지 않고 같이 살펴볼 수 있어서 안심했어요.':'하젤: 좋아요. 다음에는 혼자 걱정하지 않고 먼저 이야기해 볼게요.'});stage.querySelectorAll('[data-reflection]').forEach(b=>b.onclick=()=>{reflection=b.dataset.reflection;go(21)});stage.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>{const i=+b.dataset.tile;puzzleRotations[i]=(puzzleRotations[i]+1)%4;b.querySelector('img').style.transform=`rotate(${puzzleRotations[i]*90}deg)`});stage.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{const t=+b.dataset.tool;if(t===0)popup('내 백팩',inventoryBody(index>=10?1:0));if(t===1)popup('발견 기록',`<p>${index>=8?'시든 잎에 룬 흔적이 남아 있다. 주변의 룬과 비교해 보자.':'아직 기록한 관찰이 없어요.'}</p>`);if(t===2)popup('작은 힌트','<p>주변에서 다른 모습의 식물을 찾아보세요.<br>가까이 가면 할 수 있는 행동이 나타나요.</p>')})}
if(new URLSearchParams(location.search).has('capture'))document.body.classList.add('capture');
picker.innerHTML=scenes.map((s,i)=>`<option value="${i}">${String(i+1).padStart(2,'0')} · ${s[0]}</option>`).join('');picker.onchange=()=>go(picker.value);document.querySelector('#prev').onclick=()=>go(index-1);document.querySelector('#next').onclick=()=>go(index+1);document.querySelector('#overview').onclick=()=>{stage.innerHTML=img('01_sources/01_ADV01_확장탐험맵_source.png','full-map','전체 탐험맵')+`<section class="map-note paper"><b>온실 Adventure · 확장 동선</b><p>입구 → 회랑 → 시든 화단 → 약초 구역 → 단서 구역 → 룬 중심부</p><small>맵 배치·무드 검토용 · 분리 타일셋은 별도 제작</small></section>`+button('플레이 흐름으로 돌아가기',index,'secondary return');bind()};addEventListener('resize',fit);addEventListener('hashchange',()=>{const n=parseInt(location.hash.slice(1),10)-1;if(Number.isFinite(n)&&n!==index)go(n)});render();
