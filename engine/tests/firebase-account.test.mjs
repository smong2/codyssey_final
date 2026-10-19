import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirebaseAccountService} from '../src/services/firebase-account.mjs';

function fixture() {
  const user = {uid: 'player-1', email: 'player@example.com', emailVerified: false,
    metadata: {creationTime: '2026-10-18T00:00:00Z'}};
  const auth = {currentUser: null, async authStateReady() {}};
  const calls = [];
  const sdk = {
    async createUserWithEmailAndPassword(_auth, email) { user.email = email; auth.currentUser = user; return {user}; },
    async signInWithEmailAndPassword() { auth.currentUser = user; return {user}; },
    async sendEmailVerification() { calls.push('send-verification'); },
    async reload() { calls.push('reload'); },
    async getIdToken(_user, force) { calls.push(force ? 'token-refresh' : 'token'); return 'id-token'; },
    EmailAuthProvider: {credential(email, password) { return {email, password}; }},
    async reauthenticateWithCredential(_user, credential) { calls.push(['reauth', credential.password]); },
    async updatePassword() { calls.push('password-update'); },
    async sendPasswordResetEmail() { calls.push('password-reset'); },
    async signOut() { calls.push('sign-out'); auth.currentUser = null; },
  };
  const requests = [], removed = [];
  const service = createFirebaseAccountService({auth, sdk, apiBaseUrl: 'https://api.example',
    fetchImpl: async (url, init) => { requests.push({url, init}); return {ok: true, async json() { return {revoked: true}; }}; },
    storage: {removeItem(key) { removed.push(key); }}});
  return {user, auth, calls, requests, removed, service};
}

test('Firebase account adapter keeps unverified users out of protected API and refreshes verification', async () => {
  const f = fixture();
  const signedUp = await f.service.signup({email: 'player@example.com', password: 'secret-123', privacyConsent: true});
  assert.equal(signedUp.emailVerified, false);
  await assert.rejects(f.service.getIdToken(), error => error.code === 'FORBIDDEN');
  assert.deepEqual(f.calls, ['send-verification']);
  f.user.emailVerified = true;
  assert.equal((await f.service.checkVerification()).emailVerified, true);
  assert.equal(await f.service.getIdToken(), 'id-token');
  assert.equal(await f.service.getIdToken({forceRefresh: true}), 'id-token');
  assert.equal(f.calls.at(-1), 'token-refresh');
  assert.equal((await f.service.getSession()).uid, 'player-1');
});

test('session revocation reauthenticates again and account deletion removes local cache', async () => {
  const f = fixture();
  f.auth.currentUser = f.user; f.user.emailVerified = true;
  assert.equal((await f.service.revokeOtherSessions({password: 'current-password'})).uid, 'player-1');
  assert.deepEqual(f.calls.filter(item => Array.isArray(item)),
    [['reauth', 'current-password'], ['reauth', 'current-password']]);
  assert.equal(f.requests[0].url, 'https://api.example/v1/account/revoke-sessions');
  assert.equal(f.requests[0].init.headers.Authorization, 'Bearer id-token');
  await f.service.deleteAccount({password: 'current-password'});
  assert.equal(f.requests[1].url, 'https://api.example/v1/account');
  assert.deepEqual(f.removed, ['lumia.engine.dev.v1:account:player-1']);
  assert.equal(f.auth.currentUser, null);
});
