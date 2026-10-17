import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountUI} from '../src/ui/account.mjs';

function node(tag, text = '') {
  const attributes = {};
  return {
    tag, text, value: '', type: '', disabled: false, children: [], attributes,
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
    setAttribute(name, value) { attributes[name] = value; },
    querySelectorAll(selector) { return selector === 'input[type="password"]' ? all(this).filter(item=>item.tag==='input'&&item.type==='password') : []; },
    get textContent() { return [this.text, ...this.children.map(item => item.textContent)].filter(Boolean).join(' '); },
    get innerHTML() { return ''; }, set innerHTML(value) { this.children = []; this.text = value; }
  };
}
const all = element => [element, ...element.children.flatMap(all)];
function setup(overrides = {}) {
  const shell = node('main'), el = (tag, text = '') => node(tag, text);
  const calls = [], callbacks = {authenticated: [], signedOut: 0, returned: 0};
  const session = {uid:'u-1', email:'player@example.com', emailVerified:true, createdAt:'2026-10-15T00:00:00Z'};
  const service = {
    async getSession() { return null; }, async login() { return session; },
    async signup() { return {...session, emailVerified:false}; }, async checkVerification() { return session; },
    async sendVerification() {}, async resetPassword() {}, async changePassword() {},
    async revokeOtherSessions() { return session; }, async logout() {}, async deleteAccount() {},
    ...overrides
  };
  const ui = createAccountUI({el, btn:(label, fn) => Object.assign(el('button', label), {onclick:fn}), shell,
    heading(title, cls) { shell.className=cls; shell.replaceChildren(el('h1',title)); }, modal:()=>{}, service,
    onAuthenticated:value=>callbacks.authenticated.push(value), onSignedOut:()=>callbacks.signedOut++, onReturn:()=>callbacks.returned++});
  const click = label => { const button=all(shell).find(item=>item.tag==='button'&&item.text===label); assert.ok(button,`button ${label}`); assert.equal(button.disabled,false); button.onclick(); };
  return {ui,shell,service,calls,callbacks,session,click};
}

test('startup never enters the game for a restored unverified session', async () => {
  const s=setup({async getSession(){return {...s.session,emailVerified:false};}});
  await s.ui.start();
  assert.equal(s.callbacks.authenticated.length,0);
  assert.match(s.shell.textContent,/인증/);
});

test('startup authenticates only a verified session and open displays read-only account details', async () => {
  const s=setup({async getSession(){return s.session;}});
  await s.ui.start();
  assert.deepEqual(s.callbacks.authenticated,[s.session]);
  s.ui.open();
  assert.match(s.shell.textContent,/player@example.com/);
  assert.match(s.shell.textContent,/2026\.10\.15/);
  assert.doesNotMatch(s.shell.textContent,/이메일 변경|닉네임/);
});

test('signup requires consent, eight characters, and matching confirmation before service call', async () => {
  let signups=0; const s=setup({async signup(input){signups++;return {...s.session,emailVerified:false};}});
  s.ui.open(); s.click('회원가입');
  let fields=all(s.shell).filter(item=>item.tag==='input');
  fields.find(item=>item.type==='email').value='player@example.com';
  fields.find(item=>item.type==='password').value='short';
  s.click('회원가입');
  assert.equal(signups,0); assert.match(s.shell.textContent,/8자/);
});

test('signup rejects mismatched passwords and missing consent before service call', async () => {
  let signups=0;const s=setup({async signup(){signups++;return s.session;}});s.ui.open();s.click('회원가입');
  const fields=all(s.shell).filter(item=>item.tag==='input');
  fields.find(item=>item.type==='email').value='player@example.com';
  const passwords=fields.filter(item=>item.type==='password');passwords[0].value='long-password';passwords[1].value='different-password';
  s.click('회원가입');assert.equal(signups,0);assert.match(s.shell.textContent,/일치하지 않습니다/);
  const retry=all(s.shell).filter(item=>item.tag==='input');retry.find(item=>item.type==='email').value='player@example.com';
  const retryPasswords=retry.filter(item=>item.type==='password');retryPasswords[0].value='long-password';retryPasswords[1].value='long-password';
  s.click('회원가입');assert.equal(signups,0);assert.match(s.shell.textContent,/동의해주세요/);
});

test('unverified signup enters verification view and does not authenticate', async () => {
  const s=setup(); s.ui.open(); s.click('회원가입');
  for (const input of all(s.shell).filter(item=>item.tag==='input')) {
    if(input.type==='email') input.value='player@example.com';
    if(input.type==='password') input.value='long-password';
  }
  const consent=all(s.shell).find(item=>item.type==='checkbox'); consent.checked=true;
  s.click('회원가입'); await new Promise(resolve=>setImmediate(resolve));
  assert.match(s.shell.textContent,/인증 메일/);
  assert.equal(s.callbacks.authenticated.length,0);
});

test('switching accounts from verification logs out the pending provider session first', async () => {
  const events=[];const s=setup({async login(){return {...s.session,emailVerified:false};},async logout(){events.push('logout');}});
  s.ui.open();all(s.shell).find(item=>item.type==='email').value='player@example.com';all(s.shell).find(item=>item.type==='password').value='secret-password';
  s.click('로그인');await new Promise(resolve=>setImmediate(resolve));s.click('다른 계정으로 로그인');await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(events,['logout']);assert.equal(s.callbacks.signedOut,1);assert.match(s.shell.textContent,/로그인/);
});

test('cancel invalidates late login response and clears entered passwords', async () => {
  let resolveLogin; const s=setup({login:()=>new Promise(resolve=>resolveLogin=resolve)});
  s.ui.open();
  all(s.shell).find(item=>item.type==='email').value='player@example.com';
  const password=all(s.shell).find(item=>item.type==='password'); password.value='secret-password';
  s.click('로그인'); s.ui.cancel(); resolveLogin(s.session); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(s.callbacks.authenticated.length,0);
  assert.equal(password.value,'');
});

test('password changes validate confirmation and pass only the requested values to the adapter', async () => {
  let received;const s=setup({async getSession(){return s.session;},async changePassword(value){received=value;}});
  await s.ui.start();s.ui.open();s.click('비밀번호 변경');
  const fields=all(s.shell).filter(item=>item.type==='password');
  fields[0].value='old-password';fields[1].value='new-password';fields[2].value='mismatch';
  s.click('변경');assert.equal(received,undefined);assert.match(s.shell.textContent,/일치하지 않습니다/);
  const next=all(s.shell).filter(item=>item.type==='password');next[0].value='old-password';next[1].value='new-password';next[2].value='new-password';
  s.click('변경');await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(received,{currentPassword:'old-password',newPassword:'new-password'});
  assert.match(s.shell.textContent,/비밀번호를 변경했습니다/);
});

test('adapter credential errors are replaced with the generic login message', async () => {
  const s=setup({async login(){throw Object.assign(new Error('private raw error player@example.com'),{code:'auth/invalid-credential'});}});
  s.ui.open();all(s.shell).find(item=>item.type==='email').value='player@example.com';all(s.shell).find(item=>item.type==='password').value='secret-password';
  s.click('로그인');await new Promise(resolve=>setImmediate(resolve));
  assert.match(s.shell.textContent,/이메일 또는 비밀번호를 확인해주세요/);
  assert.doesNotMatch(s.shell.textContent,/private raw error|player@example.com/);
});

test('failed account requests clear password fields and disable controls while pending', async () => {
  let rejectLogin;const s=setup({login:()=>new Promise((_,reject)=>rejectLogin=reject)});s.ui.open();
  all(s.shell).find(item=>item.type==='email').value='player@example.com';const password=all(s.shell).find(item=>item.type==='password');password.value='secret-password';
  const login=all(s.shell).find(item=>item.tag==='button'&&item.text==='로그인');login.onclick();
  assert.ok(all(s.shell).filter(item=>item.tag==='button').every(item=>item.disabled));
  rejectLogin(Object.assign(new Error('temporary'),{code:'network'}));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(password.value,'');assert.match(s.shell.textContent,/잠시 후 다시 시도해주세요/);
});

test('other-session revocation keeps the current verified session and calls the adapter with password', async () => {
  let received;const s=setup({async getSession(){return s.session;},async revokeOtherSessions(value){received=value;return s.session;}});
  await s.ui.start();s.ui.open();s.click('다른 기기에서 모두 로그아웃');
  all(s.shell).find(item=>item.type==='password').value='current-password';s.click('다른 기기 로그아웃');await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(received,{password:'current-password'});assert.equal(s.callbacks.signedOut,0);
  assert.match(s.shell.textContent,/다른 기기의 로그인 상태를 해제했습니다/);
});

test('account deletion requires explicit acknowledgement and reauthentication failures ask for the current password', async () => {
  let deletes=0;const s=setup({async getSession(){return s.session;},async deleteAccount(value){deletes++;if(deletes===1)throw Object.assign(new Error('recent login needed'),{code:'REAUTH_REQUIRED'});assert.deepEqual(value,{password:'current-password'});}});
  await s.ui.start();s.ui.open();s.click('계정 탈퇴');s.click('계정 탈퇴');
  assert.equal(deletes,0);assert.match(s.shell.textContent,/확인해주세요/);
  all(s.shell).find(item=>item.type==='checkbox').checked=true;s.click('계정 탈퇴');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(deletes,1);assert.ok(all(s.shell).some(item=>item.type==='password'));
  all(s.shell).find(item=>item.type==='checkbox').checked=true;all(s.shell).find(item=>item.type==='password').value='current-password';
  s.click('계정 탈퇴');await new Promise(resolve=>setImmediate(resolve));assert.equal(deletes,2);assert.equal(s.callbacks.signedOut,1);
  assert.doesNotMatch(s.shell.textContent,/연결된 이메일/);assert.ok(all(s.shell).some(item=>item.tag==='input'&&item.type==='email'));
});

test('current-device logout notifies the parent and replaces account details with login', async () => {
  const s=setup({async getSession(){return s.session;}});await s.ui.start();s.ui.open();s.click('이 기기에서 로그아웃');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(s.callbacks.signedOut,1);assert.doesNotMatch(s.shell.textContent,/연결된 이메일/);
  assert.ok(all(s.shell).some(item=>item.tag==='input'&&item.type==='email'));
});

test('missing optional account methods disable only their own controls', async () => {
  const s=setup({changePassword:undefined,revokeOtherSessions:undefined,deleteAccount:undefined,getSession:undefined});
  s.ui.open();
  const buttons=all(s.shell).filter(item=>item.tag==='button');
  assert.equal(buttons.find(item=>item.text==='로그인').disabled,false);
  assert.equal(buttons.find(item=>item.text==='회원가입').disabled,false);
  const account=setup({async getSession(){return s.session;},changePassword:undefined,revokeOtherSessions:undefined,deleteAccount:undefined});
  await account.ui.start();account.ui.open();account.click('비밀번호 변경');
  assert.equal(all(account.shell).find(item=>item.tag==='button'&&item.text==='변경').disabled,true);
});

test('service-free preview keeps forms visible but disables account actions', async () => {
  const shell=node('main');const ui=createAccountUI({el:(tag,text='')=>node(tag,text),btn:(label,fn)=>Object.assign(node('button',label),{onclick:fn}),shell,heading(title){shell.replaceChildren(node('h1',title));},modal:()=>{},onReturn:()=>{}});
  await ui.start();assert.match(shell.textContent,/계정 서비스 연결/);assert.ok(all(shell).some(item=>item.tag==='input'));
  assert.equal(all(shell).find(item=>item.tag==='button'&&item.text==='로그인').disabled,true);
  assert.equal(all(shell).find(item=>item.tag==='button'&&item.text==='비밀번호를 잊으셨나요?').disabled,false);
  all(shell).find(item=>item.tag==='button'&&item.text==='비밀번호를 잊으셨나요?').onclick();
  assert.equal(all(shell).find(item=>item.tag==='button'&&item.text==='재설정 메일 보내기').disabled,true);
  all(shell).find(item=>item.tag==='button'&&item.text==='취소').onclick();
  assert.equal(all(shell).find(item=>item.tag==='button'&&item.text==='회원가입').disabled,false);
});
