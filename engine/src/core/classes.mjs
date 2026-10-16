// Current curriculum: document/content/06_01_LOCATION_ACTIVITIES.md.
export const CLASSES=[
 {id:'observatory-mirror',title:'거울 마법',stat:'exploration',locationId:'observatory',locationCode:'OBS',durationMs:120000},
 {id:'starlight-stage',title:'별빛 무대',stat:'expression',locationId:'plaza',locationCode:'CLK',durationMs:75000},
 {id:'spirit-pot-sort',title:'정령 화분 정리',stat:'knowledge',locationId:'greenhouse',locationCode:'GH',durationMs:120000},
 {id:'sealed-shelves',title:'봉인 서가',stat:'knowledge',locationId:'library',locationCode:'LIB',durationMs:120000},
 {id:'rune-circuit',title:'룬 회로',stat:'magic',locationId:'workshop',locationCode:'WRK',durationMs:120000},
 {id:'rune-pin-training',title:'룬 핀 훈련',stat:'dexterity',locationId:'training',locationCode:'TRN',durationMs:90000}
].map(lesson=>({...lesson,curriculum:true,sceneKey:'course-'+lesson.id}));
// Read old schedules/results without rewriting their action IDs or stat mappings.
export const LEGACY_CLASSES=[
 {id:'rune-circuit',title:'룬 회로',stat:'magic',locationId:'workshop'},
 {id:'excavation',title:'호숫가 유물 발굴',stat:'exploration',locationId:'lakeside'},
 {id:'rune-link',title:'기억의 서고',stat:'knowledge',locationId:'library'},
 {id:'training-guardian',title:'훈련장 수호',stat:'dexterity',locationId:'training'},
 {id:'rune-merge',title:'온실 룬 연성',stat:'knowledge',locationId:'greenhouse'},
 {id:'mirror-magic',title:'거울 마법',stat:'magic',locationId:'observatory'},
 {id:'seal-dismantle',title:'시계탑 봉인 해체',stat:'exploration',locationId:'plaza'}
];
export const classOf=action=>{const id=action==='class'?'rune-circuit':action;return CLASSES.find(c=>c.id===id)??LEGACY_CLASSES.find(c=>c.id===id);};
export const validAction=action=>action==='rest'||action==='adventure'||action==='fairy-trade'||Boolean(classOf(action));
