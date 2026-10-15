// Proposed class names/stat mappings stay replaceable; score is not a growth value.
export const CLASSES=[
 {id:'rune-circuit',title:'룬 회로',stat:'magic',locationId:'workshop'},
 {id:'excavation',title:'호숫가 유물 발굴',stat:'exploration',locationId:'lakeside'},
 {id:'rune-link',title:'기억의 서고',stat:'knowledge',locationId:'library'},
 {id:'training-guardian',title:'훈련장 수호',stat:'dexterity',locationId:'training'},
 {id:'rune-merge',title:'온실 룬 연성',stat:'knowledge',locationId:'greenhouse'},
 {id:'mirror-magic',title:'거울 마법',stat:'magic',locationId:'observatory'},
 {id:'seal-dismantle',title:'시계탑 봉인 해체',stat:'exploration',locationId:'plaza'}
];
export const classOf=action=>CLASSES.find(c=>c.id===(action==='class'?'rune-circuit':action));
export const validAction=action=>action==='rest'||action==='adventure'||Boolean(classOf(action));
