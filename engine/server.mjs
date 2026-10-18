import http from 'node:http';
import {readFile,stat,open} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assetReference} from './src/core/asset-paths.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4','.mp3':'audio/mpeg'};
const audioAssets=new Map([
 ['/audio-assets/bgm_title_intro.mp3','bgm_title_intro.mp3'],
 ['/audio-assets/bgm_title_main.mp3','bgm_title_main.mp3'],
 ['/audio-assets/bgm_admission_invitation.mp3','bgm_admission_invitation.mp3'],
 ['/audio-assets/bgm_myroom.mp3','bgm_myroom.mp3'],
 ['/audio-assets/sfx_button_click.mp3','sfx_button_click.mp3'],
 ['/audio-assets/sfx_diary_open.mp3','sfx_diary_open.mp3']
]);
export function resolveAudioAssetFilename(pathname){return audioAssets.get(pathname)??null;}
export function createEngineServer(){
 return http.createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(pathname.includes('\\')||pathname.split('/').includes('..')){res.writeHead(403).end();return;}
   let file;
   if(pathname==='/'||pathname==='/index.html')file=path.join(root,'index.html');
   else if(pathname==='/style.css'||pathname==='/preview.css')file=path.join(root,path.basename(pathname));
   else if(/^\/src\/.+\.(mjs|js)$/.test(pathname))file=path.join(root,pathname);
   else if(/^\/(vendor\/phaser\.min\.js|minigame-demo\/(src\/.+\.js|vendor\/phaser\.min\.js))$/.test(pathname))file=path.join(root,pathname);
   else if(/^\/world-assets\/[\w.-]+\.png$/.test(pathname))file=path.join(root,'../asset/background',assetReference('background',path.basename(pathname)).file);
   else if(/^\/character-assets\/[\w.-]+\.png$/.test(pathname))file=path.join(root,'../asset/character',path.basename(pathname));
   else if(/^\/design-assets\/(ui|effect|bern|pet|map|font_files|item|badge|sd_character|puzzle)\/[\p{L}\p{N}_.-]+\.(png|webp|svg|woff2)$/u.test(pathname)){const [,category,name]=pathname.slice('/design-assets/'.length).match(/^([^/]+)\/(.+)$/),resolved=assetReference(category,name);file=path.join(root,'../asset',resolved.category,resolved.file);}
   else if(/^\/sd-assets\/SD03_(S|SW|W|NW|N|NE|E|SE)_strip\.png$/.test(pathname))file=path.join(root,'../prototype/assets',path.basename(pathname));
   else if(pathname==='/intro.mp4')file=path.join(root,'../prototype/assets/intro.mp4');
   else if(resolveAudioAssetFilename(pathname)){const filename=resolveAudioAssetFilename(pathname),folder=filename.startsWith('bgm_')?'bgm':'sfx';file=path.join(root,'../asset/audio',folder,filename);}
   if(!file){res.writeHead(404).end();return;}
   const extension=path.extname(file).toLowerCase();
   if(extension==='.mp4'||extension==='.mp3'){
    const {size}=await stat(file),headers={'Content-Type':types[extension],'Accept-Ranges':'bytes','Cache-Control':'no-store'};
    let start=0,end=size-1,status=200;
    if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||!match[1]&&!match[2]){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
     start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
     if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
     status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD'){res.end();return;}
    const handle=await open(file);try{await new Promise((resolve,reject)=>{const stream=handle.createReadStream({start,end,autoClose:false});stream.on('error',reject);res.on('close',()=>{stream.destroy();resolve();});res.on('finish',resolve);stream.pipe(res);});}finally{await handle.close();}return;
   }
   const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
  }catch(error){res.writeHead(error instanceof URIError?400:404).end();}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const server=createEngineServer();
 server.on('error',e=>{console.error('서버를 시작하지 못했습니다:',e.message);process.exitCode=1;});
 server.listen(Number(process.env.LUMIA_ENGINE_PORT||4173),'127.0.0.1',()=>console.log('LUMIA engine: http://127.0.0.1:'+server.address().port));
}
