export function attachIntro(video,{complete,fallback,schedule=setTimeout,cancel=clearTimeout}){
 let done=false,disposed=false,failing=false,deadline;
 const finish=()=>{if(done||disposed)return;done=true;cancel(deadline);complete();};
 const fail=()=>{if(done||disposed||failing)return;failing=true;cancel(deadline);video.pause();fallback();deadline=schedule(finish,1800);};
 video.addEventListener('ended',finish);video.addEventListener('error',fail);
 deadline=schedule(fail,20000);video.muted=true;
 try{Promise.resolve(video.play()).catch(fail);}catch{fail();}
 return ()=>{disposed=true;cancel(deadline);video.removeEventListener('ended',finish);video.removeEventListener('error',fail);video.pause();video.removeAttribute('src');video.querySelectorAll?.('source').forEach(s=>s.removeAttribute('src'));video.load();};
}
