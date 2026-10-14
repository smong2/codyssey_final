import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {stat} from 'node:fs/promises';
const require=createRequire(import.meta.url),sharp=require(process.argv[2]||'sharp');
const dir=fileURLToPath(new URL('../../asset/map/',import.meta.url));
const quality=Number(process.argv[3]||85);
if(!Number.isInteger(quality)||quality<1||quality>100)throw new Error('WebP quality must be 1–100');
const master=path.join(dir,'map01_greenhouse_master_3840x2160.png'),mask=path.join(dir,'map01_greenhouse_collision_mask_3840x2160.png'),foreground=path.join(dir,'map01_greenhouse_foreground_3840x2160.png');
for(const source of [master,mask,foreground]){const m=await sharp(source).metadata();if(m.width!==3840||m.height!==2160)throw new Error('Expected aligned 3840×2160 source: '+source);}
for(const width of [3840,1920]){
 await sharp(master).resize(width,width*9/16).webp({quality,effort:4}).toFile(path.join(dir,`map01_greenhouse_world_${width}x${width*9/16}.webp`));
 await sharp(foreground).resize(width,width*9/16).webp({lossless:true,effort:4}).toFile(path.join(dir,`map01_greenhouse_foreground_${width}x${width*9/16}.webp`));
}
// Conservative B/W export: only fully opaque pure white stays walkable.
const {data,info}=await sharp(mask).resize(1920,1080,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const binary=Buffer.alloc(1920*1080);
for(let i=0;i<binary.length;i++){const j=i*info.channels;binary[i]=data[j]===255&&data[j+1]===255&&data[j+2]===255&&data[j+3]===255?255:0;}
const maskFile='map01_greenhouse_collision_mask_1920x1080.png';
await sharp(binary,{raw:{width:1920,height:1080,channels:1}}).png().toFile(path.join(dir,maskFile));
for(const file of ['map01_greenhouse_world_3840x2160.webp','map01_greenhouse_world_1920x1080.webp','map01_greenhouse_foreground_3840x2160.webp','map01_greenhouse_foreground_1920x1080.webp',maskFile])console.log(file,(await stat(path.join(dir,file))).size,'bytes');
