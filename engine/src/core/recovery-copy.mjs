const codeOf=error=>String(error?.code??'').toUpperCase();

export function serverSaveRecoveryCopy(error){
 const code=codeOf(error),conflict=error?.status===409||code==='CONFLICT';
 if(conflict)return {
  kind:'conflict',title:'더 최근에 저장된 게임이 있어요',
  message:'지금 화면보다 새로 저장된 게임을 찾았어요.',
  hint:'최근 저장을 불러오면 그곳에서 계속할 수 있어요.',
  status:'아래 버튼을 누르면 안전하게 불러올게요.',
  retryLabel:null,loadLabel:'최근 저장 불러오기',
 };
 const connection=['NETWORK','TIMEOUT','SERVICE_UNAVAILABLE'].includes(code);
 const retryBlocked=['AUTH_REQUIRED','FORBIDDEN','VALIDATION','NOT_FOUND'].includes(code);
 return {
  kind:connection?'connection':'save',
  title:connection?'연결이 잠깐 끊겼어요':'저장을 다시 확인해 주세요',
  message:connection?'게임을 저장하는 중에 연결이 잠깐 끊겼어요. 지금 화면은 그대로 있어요.':'게임을 저장했는지 확인이 필요해요. 지금 화면은 그대로 있어요.',
  hint:connection?'인터넷 연결을 확인한 뒤 아래 버튼을 눌러 주세요.':'아래 버튼을 누르면 안전하게 다시 확인할게요.',
  status:'아직 다음 화면으로 넘어가지 않았어요.',
  retryLabel:retryBlocked?null:'다시 저장하기',loadLabel:'저장된 곳에서 이어하기',
 };
}

export function serverLoadRecoveryCopy(error){
 const code=codeOf(error),connection=['NETWORK','TIMEOUT','SERVICE_UNAVAILABLE'].includes(code);
 return {
  title:'게임을 불러오지 못했어요',
  message:connection?'인터넷 연결이 잠깐 끊겼을 수 있어요.':'게임을 불러오는 중에 문제가 생겼어요.',
  hint:connection?'인터넷 연결을 확인한 뒤 다시 불러오기를 눌러 주세요.':'잠시 후 다시 불러오기를 눌러 주세요.',
  actionLabel:'다시 불러오기',
 };
}

export function dialogueRecoveryCopy(){
 return {
  title:'이야기를 잠시 불러오지 못했어요',
  message:'연결이 잠깐 끊겼을 수 있어요. 지금까지의 게임은 그대로 있어요.',
  hint:'아래 버튼을 누르면 다시 확인할게요.',
  actionLabel:'다시 시도하기',
 };
}
