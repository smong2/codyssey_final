import {canWalk} from './collision.mjs';

export const ADVENTURE_LOCATIONS=Object.freeze([
 Object.freeze({id:'greenhouse',title:'유리 온실·약초원',mapId:'greenhouse',previewOnly:true}),
 Object.freeze({id:'library',title:'대서고',mapId:'library',previewOnly:true}),
 Object.freeze({id:'observatory',title:'별빛 천문대',mapId:'observatory',previewOnly:true})
]);
export const isAdventureLocation=id=>ADVENTURE_LOCATIONS.some(place=>place.id===id);

// All coordinates/radii below use world units, independent of mask resolution.
export const ADVENTURE_GEOMETRY=Object.freeze({footRadius:24,investigationRadius:88,spawnRadius:220,spacing:200});
export const ADVENTURE_MAPS=Object.freeze({
 greenhouse:Object.freeze({
  world:'./design-assets/map/MP01_greenhouse_world_3840x2160.webp',
  thumbnail:'./design-assets/map/MP01_greenhouse_world_1920x1080.webp',
  mask:'./design-assets/map/MP01_greenhouse_collision_mask_1920x1080.png',
  foreground:'./design-assets/map/MP01_greenhouse_foreground_3840x2160.webp',
  spawn:Object.freeze({x:1920,y:2000}),zoom:0.7,
  placement:Object.freeze({wallClearance:ADVENTURE_GEOMETRY.footRadius,forbiddenZones:Object.freeze([])})
 }),
 library:Object.freeze({
  world:'./design-assets/map/MP02_grand_library_world_3840x2160.webp',
  thumbnail:'./design-assets/map/MP02_grand_library_world_1920x1080.webp',
  mask:'./design-assets/map/MP02_grand_library_collision_mask_1920x1080.png',
  foreground:'./design-assets/map/MP02_grand_library_foreground_3840x2160.webp',
  spawn:Object.freeze({x:1920,y:2100}),zoom:0.7,
  placement:Object.freeze({wallClearance:ADVENTURE_GEOMETRY.footRadius,forbiddenZones:Object.freeze([])})
 }),
 observatory:Object.freeze({
  world:'./design-assets/map/MP03_starlight_observatory_world_3840x2160.webp',
  thumbnail:'./design-assets/map/MP03_starlight_observatory_world_1920x1080.webp',
  mask:'./design-assets/map/MP03_starlight_observatory_collision_mask_1920x1080.png',
  foreground:'./design-assets/map/MP03_starlight_observatory_foreground_3840x2160.webp',
  spawn:Object.freeze({x:1920,y:2100}),zoom:0.7,
  placement:Object.freeze({wallClearance:ADVENTURE_GEOMETRY.footRadius,forbiddenZones:Object.freeze([])})
 })
});
export function getAdventureMap(mapId){
 if(!Object.hasOwn(ADVENTURE_MAPS,mapId))throw new Error('등록되지 않은 모험 지도입니다: '+mapId);
 return ADVENTURE_MAPS[mapId];
}

const PREVIEW_OBJECTS=Object.freeze({
 greenhouse:['푸른 잎의 씨앗','작은 약초 주머니','햇살을 머금은 유리구슬','반짝이는 룬 조각','은빛 물뿌리개'],
 library:['책갈피 룬 조각','빛바랜 서가 열쇠','접힌 관측 기록','푸른 잉크병','작은 종이별'],
 observatory:['별빛 렌즈 조각','달무늬 나침반','접힌 별자리 지도','은빛 룬 조각','작은 수정구슬']
});
const DIRECTIONS=['동쪽','남동쪽','남쪽','남서쪽','서쪽','북서쪽','북쪽','북동쪽'];
const clockDirections=['3시','4시 30분','6시','7시 30분','9시','10시 30분','12시','1시 30분'];
const hashSeed=value=>{let h=2166136261;for(const char of String(value)){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
function random(seed){let value=seed>>>0;return()=>{value=(value+0x6D2B79F5)|0;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function maskPoint(mask,mx,my){return{x:(mx+0.5)*mask.worldWidth/mask.width,y:(my+0.5)*mask.worldHeight/mask.height};}

// Erode walls by a world-sized footprint before checking connectivity from spawn.
function reachableSafeArea(mask,spawn,{gridStep=18,wallClearance=ADVENTURE_GEOMETRY.footRadius,spawnRadius=ADVENTURE_GEOMETRY.spawnRadius,spacing=ADVENTURE_GEOMETRY.spacing,investigationRadius=ADVENTURE_GEOMETRY.investigationRadius,forbiddenZones=[]}={},tracePaths=false){
 if(!mask||!Number.isInteger(mask.width)||!Number.isInteger(mask.height)||mask.pixels?.length!==mask.width*mask.height*4||
  !(mask.worldWidth>0)||!(mask.worldHeight>0)||!Number.isInteger(gridStep)||gridStep<1||[wallClearance,spawnRadius,spacing,investigationRadius].some(n=>!Number.isFinite(n)||n<0)||
  !Array.isArray(forbiddenZones)||forbiddenZones.some(z=>!z||!Number.isFinite(z.x)||!Number.isFinite(z.y)||!Number.isFinite(z.width)||!Number.isFinite(z.height)||z.width<=0||z.height<=0))
  throw new Error('모험 충돌 마스크가 올바르지 않습니다.');
 if(!canWalk(mask,spawn.x,spawn.y))throw new Error('모험 시작점이 이동 가능한 영역이 아닙니다.');
 const total=mask.width*mask.height,reachable=new Uint8Array(total),safeCells=new Uint8Array(total),queue=new Int32Array(total),parents=tracePaths?new Int32Array(total):null,stride=mask.width+1,blocked=new Uint32Array(stride*(mask.height+1));
 const white=index=>{const i=index*4,p=mask.pixels;return p[i]===255&&p[i+1]===255&&p[i+2]===255&&p[i+3]===255;};
 for(let y=0;y<mask.height;y++){let row=0;for(let x=0;x<mask.width;x++){row+=white(y*mask.width+x)?0:1;blocked[(y+1)*stride+x+1]=blocked[y*stride+x+1]+row;}}
 const rx=Math.ceil(wallClearance*mask.width/mask.worldWidth),ry=Math.ceil(wallClearance*mask.height/mask.worldHeight);
 for(let y=ry;y<mask.height-ry;y++)for(let x=rx;x<mask.width-rx;x++){
  const x0=x-rx,y0=y-ry,x1=x+rx+1,y1=y+ry+1;
  if(blocked[y1*stride+x1]-blocked[y0*stride+x1]-blocked[y1*stride+x0]+blocked[y0*stride+x0]===0)safeCells[y*mask.width+x]=1;
 }
 const sx=Math.floor(spawn.x/mask.worldWidth*mask.width),sy=Math.floor(spawn.y/mask.worldHeight*mask.height),start=sy*mask.width+sx;
 if(!safeCells[start])throw new Error('모험 시작점에 캐릭터 발 영역의 안전 여유가 부족합니다. 지도 시작점을 확인해 주세요.');
 let head=0,tail=0;reachable[start]=1;queue[tail++]=start;
 while(head<tail){const at=queue[head++],x=at%mask.width,y=(at-x)/mask.width;
  for(const next of [x>0?at-1:-1,x+1<mask.width?at+1:-1,y>0?at-mask.width:-1,y+1<mask.height?at+mask.width:-1])
   if(next>=0&&!reachable[next]&&safeCells[next]){reachable[next]=1;if(parents)parents[next]=at;queue[tail++]=next;}
 }
 return{reachable,parents,start,rx,ry,gridStep,wallClearance,spawnRadius,spacing,investigationRadius,forbiddenZones};
}

export function reachableSafeCandidates(mask,spawn,placement={}){
 const {reachable,rx,ry,gridStep,wallClearance,spawnRadius,spacing,investigationRadius,forbiddenZones}=reachableSafeArea(mask,spawn,placement);
 const candidates=[],minimumSpacing=Math.max(spacing,2*investigationRadius);
 for(let y=ry;y<mask.height-ry;y+=gridStep)for(let x=rx;x<mask.width-rx;x+=gridStep){
  if(!reachable[y*mask.width+x])continue;const point=maskPoint(mask,x,y);
  if(Math.hypot(point.x-spawn.x,point.y-spawn.y)<spawnRadius||forbiddenZones.some(z=>point.x>=z.x-wallClearance&&point.x<=z.x+z.width+wallClearance&&point.y>=z.y-wallClearance&&point.y<=z.y+z.height+wallClearance))continue;
  if(candidates.every(other=>Math.hypot(point.x-other.x,point.y-other.y)>=minimumSpacing))candidates.push(point);
 }
 return candidates;
}

// Shortest routes use the same eroded, spawn-connected mask as objective placement.
export function reachableSafeRoutes(mask,spawn,targets,placement={}){
 const {reachable,parents,start}=reachableSafeArea(mask,spawn,placement,true);
 return targets.map(target=>{
  const x=Math.floor(target.x/mask.worldWidth*mask.width),y=Math.floor(target.y/mask.worldHeight*mask.height),end=y*mask.width+x;
  if(x<0||x>=mask.width||y<0||y>=mask.height||!reachable[end])return [];
  const route=[];
  for(let at=end;;at=parents[at]){route.push(maskPoint(mask,at%mask.width,Math.floor(at/mask.width)));if(at===start)break;}
  route.reverse();route[0]={x:spawn.x,y:spawn.y};route[route.length-1]={x:target.x,y:target.y};return route;
 });
}

export function clueForPoint(origin,target){
 const angle=(Math.atan2(target.y-origin.y,target.x-origin.x)+Math.PI*2)%(Math.PI*2),index=Math.round(angle/(Math.PI/4))%8;
 return `입구에서 ${clockDirections[index]} 방향`;
}

export function createPreviewObjectives({mask,spawn,count,seed,locationId='greenhouse',placement}){
 if(!Number.isInteger(count)||count<1||count>5)throw new Error('모험 목표 개수는 1~5개여야 합니다.');
 const labels=PREVIEW_OBJECTS[locationId];if(!labels)throw new Error('등록되지 않은 모험 장소입니다.');
 const candidates=reachableSafeCandidates(mask,spawn,placement);if(candidates.length<count)throw new Error('충돌 마스크에서 배치 가능한 목표 위치가 부족합니다.');
 const rng=random(hashSeed(seed)),pool=[...candidates];
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,count).map((point,index)=>({id:`${seed}-objective-${index+1}`,name:labels[index],clue:clueForPoint(spawn,point),x:point.x,y:point.y}));
}

export function qualitativeHint(from,target){
 const angle=(Math.atan2(target.y-from.y,target.x-from.x)+Math.PI*2)%(Math.PI*2),direction=DIRECTIONS[Math.round(angle/(Math.PI/4))%8];
 const distance=Math.hypot(target.x-from.x,target.y-from.y);
 const range=distance<150?'가까이':distance<420?'조금 더':'아직 조금';
 return `${direction} 쪽을 더 찾아보자. ${range} 있는 것 같아.`;
}

export function investigateObjective(position,objectives,foundIds=[],radius=ADVENTURE_GEOMETRY.investigationRadius,trackedId=null){
 const found=new Set(foundIds),nearby=objectives.find(item=>!found.has(item.id)&&Math.hypot(item.x-position.x,item.y-position.y)<=radius);
 if(nearby)return{foundId:nearby.id,hint:null};
 const tracked=objectives.find(item=>item.id===trackedId&&!found.has(item.id))??objectives.find(item=>!found.has(item.id));
 return{foundId:null,hint:tracked?qualitativeHint(position,tracked):null};
}
