import {accountErrorMessage, displayCreatedAt, isVerifiedAccountSession} from '../core/account.mjs';

const CONSENT = '수집 항목: 이메일 주소\n이용 목적: 계정 인증, 로그인, 비밀번호 재설정, 게임 저장 데이터 연결\n보관 기간: 회원 탈퇴 시까지';
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function createAccountUI({el,btn,shell,heading,modal,service,onAuthenticated=()=>{},onSignedOut=()=>{},onReturn=()=>{}}) {
  let session=null, frame='login', generation=0, busy=false, emailForVerification='', verificationMessage='이메일 인증이 필요합니다.', errorText='', notice='', requiresPassword=false;
  const hasService=Boolean(service);
  const live=id=>id===generation;
  const clearPasswords=()=>{for(const field of shell.querySelectorAll?.('input[type="password"]')??[])field.value='';};
  let activeControls=[];
  const control=(label,fn,disabled=false,method=null)=>{const item=btn(label,fn);item.disabled=disabled||busy||(method!==null&&typeof service?.[method]!=='function');activeControls.push(item);return item;};
  const input=(label,type,autocomplete,defaultValue='')=>{
    const wrap=el('label',label,'account-field'),field=el('input');field.type=type;field.value=defaultValue;
    field.setAttribute('autocomplete',autocomplete);field.setAttribute('aria-label',label);
    if(type==='email')field.setAttribute('inputmode','email');wrap.append(field);return {wrap,field};
  };
  const checkbox=(label)=>{const wrap=el('label',label,'account-consent'),field=el('input');field.type='checkbox';wrap.append(field);return {wrap,field};};
  const message=(value)=>value?el('p',value,'account-message'):null;
  function paint(title,content){
    generation++;busy=false;activeControls=[];clearPasswords();heading(title,'account-page');
    const panel=el('section',null,'account-panel');panel.append(el('h1',title));
    if(!hasService)panel.append(message('계정 서비스 연결을 기다리고 있어요. 로그인과 계정 변경은 사용할 수 없습니다.'));
    if(notice)panel.append(message(notice));if(errorText)panel.append(message(errorText));
    content(panel);shell.append(panel);
  }
  function renderLogin(){frame='login';const e=emailForVerification;paint('로그인',panel=>{
    const email=input('이메일','email','email',e),password=input('비밀번호','password','current-password');
    panel.append(email.wrap,password.wrap,control('로그인',()=>performLogin(email.field.value,password.field.value),false,'login'));
    panel.append(control('비밀번호를 잊으셨나요?',()=>renderReset(email.field.value)),control('회원가입',renderSignup));
    if(!hasService)panel.append(control('돌아가기',()=>{clearPasswords();onReturn();}));
  });}
  function renderSignup(){frame='signup';paint('회원가입',panel=>{
    const email=input('이메일','email','email'),password=input('비밀번호','password','new-password'),confirm=input('비밀번호 확인','password','new-password'),consent=checkbox('[필수] 개인정보 수집·이용 동의');
    panel.append(email.wrap,password.wrap,confirm.wrap,el('p',CONSENT,'account-policy'),consent.wrap,
      control('회원가입',()=>performSignup(email.field.value,password.field.value,confirm.field.value,consent.field.checked),false,'signup'),control('로그인',renderLogin));
  });}
  function renderVerify(){frame='verify';paint('이메일 인증 대기',panel=>{
    panel.append(message(verificationMessage));
    panel.append(control('인증 완료 확인',verify,false,'checkVerification'),control('인증 메일 다시 보내기',resend,false,'sendVerification'),control('다른 계정으로 로그인',switchAccount,false,'logout'));
  });}
  function renderReset(value=''){frame='reset';paint('비밀번호 재설정',panel=>{
    const email=input('이메일','email','email',value);panel.append(email.wrap,control('재설정 메일 보내기',()=>performReset(email.field.value),false,'resetPassword'),control('취소',()=>{notice='';renderLogin();}));
  });}
  function renderAccount(){frame='account';paint('계정',panel=>{
    panel.append(el('h2','연결된 이메일'),el('p',session?.email??'미등록','account-readonly'),el('h2','최초 가입일'),el('p',displayCreatedAt(session?.createdAt),'account-readonly'));
    panel.append(control('비밀번호 변경',renderChangePassword),control('다른 기기에서 모두 로그아웃',renderRevoke),control('이 기기에서 로그아웃',performLogout,false,'logout'),control('계정 탈퇴',renderDelete));
    panel.append(control('닫기',()=>{clearPasswords();onReturn();}));
  });}
  function renderChangePassword(){frame='change-password';paint('비밀번호 변경',panel=>{
    const current=input('현재 비밀번호','password','current-password'),next=input('새 비밀번호','password','new-password'),confirm=input('새 비밀번호 확인','password','new-password');
    panel.append(current.wrap,next.wrap,confirm.wrap,control('변경',()=>performPasswordChange(current.field.value,next.field.value,confirm.field.value),false,'changePassword'),control('현재 비밀번호를 잊으셨나요?',()=>renderReset(session?.email??'')),control('취소',renderAccount));
  });}
  function renderRevoke(){frame='revoke';paint('다른 기기에서 모두 로그아웃',panel=>{
    panel.append(message('다른 기기의 로그인 상태를 해제합니다. 이 기기에서는 계속 게임을 이용할 수 있습니다.'));
    const password=input('현재 비밀번호','password','current-password');panel.append(password.wrap,control('다른 기기 로그아웃',()=>performRevoke(password.field.value),false,'revokeOtherSessions'),control('취소',renderAccount));
  });}
  function renderDelete(){frame='delete';paint('계정 탈퇴',panel=>{
    panel.append(message('계정을 탈퇴하면 모든 게임 기록과 엔딩 편지가 영구 삭제됩니다. 삭제한 데이터는 복구할 수 없습니다.'));
    const confirm=checkbox('모든 게임 기록과 계정 데이터가 영구 삭제됨을 확인했습니다.');panel.append(confirm.wrap);
    const password=requiresPassword?input('현재 비밀번호','password','current-password'):null;if(password)panel.append(password.wrap);
    panel.append(control('계정 탈퇴',()=>performDelete(confirm.field.checked,password?.field.value),false,'deleteAccount'),control('취소',()=>{requiresPassword=false;renderAccount();}));
  });}
  function fail(error,context){
    const code=String(error?.code??error?.message??'').toLowerCase();
    if(frame==='delete'&&/requires[-_ ]?recent[-_ ]?login|reauth[-_ ]?required/.test(code))requiresPassword=true;
    errorText=accountErrorMessage(error,context);notice='';paintCurrent();
  }
  function paintCurrent(){switch(frame){case 'signup':return renderSignup();case 'verify':return renderVerify();case 'reset':return renderReset();case 'account':return renderAccount();case 'change-password':return renderChangePassword();case 'revoke':return renderRevoke();case 'delete':return renderDelete();default:return renderLogin();}}
  async function action(work,context,success){
    if(busy||!hasService)return;busy=true;for(const item of activeControls)item.disabled=true;const id=generation;errorText='';notice='';
    try{const value=await work();if(!live(id))return;busy=false;await success(value,id);}
    catch(error){if(!live(id))return;busy=false;clearPasswords();fail(error,context);}
  }
  async function performLogin(email,password){
    if(!validEmail(email)){errorText='이메일 형식을 확인해주세요.';return renderLogin();}
    if(!password){errorText='이메일 또는 비밀번호를 확인해주세요.';return renderLogin();}
    await action(()=>service.login({email:email.trim(),password}),'login',value=>{
      clearPasswords();if(!isVerifiedAccountSession(value)){session=value??null;emailForVerification=email.trim();verificationMessage='이메일 인증이 필요합니다. 이메일에서 인증을 완료해주세요.';return renderVerify();}
      session=value;onAuthenticated(value);
    });
  }
  async function performSignup(email,password,confirmation,consented){
    if(!validEmail(email)){errorText='이메일 형식을 확인해주세요.';return renderSignup();}
    if(password.length<8){errorText='비밀번호는 8자 이상으로 입력해주세요.';return renderSignup();}
    if(password!==confirmation){errorText='비밀번호 확인 값이 일치하지 않습니다.';return renderSignup();}
    if(!consented){errorText='개인정보 수집·이용에 동의해주세요.';return renderSignup();}
    emailForVerification=email.trim();
    await action(()=>service.signup({email:email.trim(),password,privacyConsent:true}),'signup',value=>{
      clearPasswords();session=value??null;verificationMessage='등록한 이메일로 인증 메일을 보냈습니다. 이메일에서 인증을 완료해주세요.';return renderVerify();
    });
  }
  async function verify(){await action(()=>service.checkVerification(),'login',value=>{
    if(!isVerifiedAccountSession(value)){errorText='이메일 인증이 필요합니다.';return renderVerify();}
    session=value;onAuthenticated(value);
  });}
  async function switchAccount(){await action(()=>service.logout(),'login',()=>{session=null;emailForVerification='';clearPasswords();onSignedOut();renderLogin();});}
  async function resend(){await action(()=>service.sendVerification(),'login',()=>{notice='인증 메일을 다시 보냈습니다.';verificationMessage='등록한 이메일로 인증 메일을 보냈습니다. 이메일에서 인증을 완료해주세요.';renderVerify();});}
  async function performReset(email){if(!validEmail(email)){errorText='이메일 형식을 확인해주세요.';return renderReset();}
    await action(()=>service.resetPassword({email:email.trim()}),'login',()=>{notice='해당 이메일로 재설정 안내를 보냈습니다.';renderReset(email.trim());});}
  async function performPasswordChange(currentPassword,newPassword,confirmation){
    if(newPassword.length<8){errorText='비밀번호는 8자 이상으로 입력해주세요.';return renderChangePassword();}
    if(newPassword!==confirmation){errorText='비밀번호 확인 값이 일치하지 않습니다.';return renderChangePassword();}
    await action(()=>service.changePassword({currentPassword,newPassword}),'reauth',()=>{notice='비밀번호를 변경했습니다.';renderAccount();});
  }
  async function performRevoke(password){if(!password){errorText='현재 비밀번호를 입력해주세요.';return renderRevoke();}
    const currentUid=session?.uid;
    await action(()=>service.revokeOtherSessions({password}),'reauth',value=>{
      if(!isVerifiedAccountSession(value)||value.uid!==currentUid){errorText='잠시 후 다시 시도해주세요.';return renderRevoke();}
      session=value;notice='다른 기기의 로그인 상태를 해제했습니다.';renderAccount();
    });
  }
  async function performLogout(){await action(()=>service.logout(),'login',()=>{session=null;clearPasswords();onSignedOut();renderLogin();});}
  async function performDelete(confirmed,password){
    if(!confirmed){errorText='계정 탈퇴와 데이터 영구 삭제를 확인해주세요.';return renderDelete();}
    await action(()=>service.deleteAccount(password?{password}:{}),'reauth',()=>{
      session=null;clearPasswords();onSignedOut();renderLogin();
    });
  }
  async function start(){frame='checking';paint('계정 확인',panel=>panel.append(message('로그인 상태를 확인하고 있어요.')));
    if(typeof service?.getSession!=='function'){renderLogin();return;}
    const id=generation;try{const value=await service.getSession();if(!live(id))return;
      if(value===null){session=null;renderLogin();}else if(isVerifiedAccountSession(value)){session=value;onAuthenticated(value);}else{session=value;emailForVerification=value?.email??'';verificationMessage='이메일 인증이 필요합니다. 이메일에서 인증을 완료해주세요.';renderVerify();}
    }catch(error){if(!live(id))return;session=null;errorText=accountErrorMessage(error,'login');renderLogin();}}
  function open(){errorText='';notice='';requiresPassword=false;return session&&isVerifiedAccountSession(session)?renderAccount():session?renderVerify():renderLogin();}
  function cancel(){generation++;busy=false;clearPasswords();errorText='';notice='';if(session&&isVerifiedAccountSession(session))onReturn();else renderLogin();}
  return {start,open,cancel};
}
