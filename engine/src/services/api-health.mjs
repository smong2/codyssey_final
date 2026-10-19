const sleep=ms=>ms>0?new Promise(resolve=>setTimeout(resolve,ms)):Promise.resolve();

export async function waitForApiReady({baseUrl,fetchImpl=globalThis.fetch,attemptTimeouts=[45000,30000],retryDelayMs=800,onAttempt=()=>{}}={}){
 if(typeof baseUrl!=='string'||!/^https?:\/\//.test(baseUrl))throw new Error('API 주소가 올바르지 않습니다.');
 if(typeof fetchImpl!=='function'||!Array.isArray(attemptTimeouts)||!attemptTimeouts.length||attemptTimeouts.some(value=>!Number.isFinite(value)||value<=0)||!Number.isFinite(retryDelayMs)||retryDelayMs<0)throw new Error('API 준비 확인 설정이 올바르지 않습니다.');
 const root=baseUrl.replace(/\/+$/,'');
 let lastStatus=0;
 for(let index=0;index<attemptTimeouts.length;index++){
  onAttempt(index+1,attemptTimeouts.length);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),attemptTimeouts[index]);
  try{
   const response=await fetchImpl(root+'/health',{method:'GET',cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal});
   lastStatus=response.status;
   if(response.ok)return {ready:true,attempts:index+1,status:response.status};
   if(response.status<500&&![408,425,429].includes(response.status))break;
  }catch(error){
   if(error?.name!=='AbortError'&&index===attemptTimeouts.length-1)throw new Error('게임 서버에 연결하지 못했습니다.');
  }finally{clearTimeout(timer);}
  if(index<attemptTimeouts.length-1)await sleep(retryDelayMs);
 }
 throw new Error(lastStatus?`게임 서버를 준비하지 못했습니다. (${lastStatus})`:'게임 서버 응답을 기다리는 시간이 초과되었습니다.');
}
