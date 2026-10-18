/** Firebase Auth browser adapter for the existing account UI. */

const sessionOf = user => user ? {
  uid: user.uid,
  email: user.email,
  emailVerified: user.emailVerified === true,
  createdAt: user.metadata?.creationTime ?? null,
} : null;

export function createFirebaseAccountService({auth, sdk, apiBaseUrl, fetchImpl = globalThis.fetch,
  storage = globalThis.localStorage} = {}) {
  if (!auth || !sdk || typeof apiBaseUrl !== 'string' || !apiBaseUrl.trim())
    throw new Error('Firebase 계정 설정이 필요합니다.');
  const current = () => {
    if (!auth.currentUser) throw Object.assign(new Error('Login required'), {code: 'AUTH_REQUIRED'});
    return auth.currentUser;
  };
  const refresh = async user => {
    await sdk.reload(user);
    await sdk.getIdToken(user, true);
    return sessionOf(user);
  };
  const reauthenticate = async password => {
    const user = current();
    if (!user.email || !password) throw Object.assign(new Error('Password required'), {code: 'REAUTH_REQUIRED'});
    await sdk.reauthenticateWithCredential(user, sdk.EmailAuthProvider.credential(user.email, password));
    return user;
  };
  const accountRequest = async (path, method, body) => {
    const token = await sdk.getIdToken(current(), true);
    const response = await fetchImpl(apiBaseUrl.replace(/\/+$/, '') + path, {
      method, headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });
    if (!response.ok) throw Object.assign(new Error('Account request failed'), {
      code: response.status === 403 ? 'REAUTH_REQUIRED' : `API_${response.status}`,
    });
    return response.json();
  };
  return {
    async getSession() {
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
      else await new Promise(resolve => { const unsubscribe = sdk.onAuthStateChanged(auth, () => { unsubscribe(); resolve(); }); });
      return auth.currentUser ? refresh(auth.currentUser) : null;
    },
    async login({email, password}) {
      const credential = await sdk.signInWithEmailAndPassword(auth, email, password);
      return refresh(credential.user);
    },
    async signup({email, password, privacyConsent}) {
      if (privacyConsent !== true) throw new Error('Privacy consent required');
      const credential = await sdk.createUserWithEmailAndPassword(auth, email, password);
      await sdk.sendEmailVerification(credential.user);
      return sessionOf(credential.user);
    },
    checkVerification() { return refresh(current()); },
    sendVerification() { return sdk.sendEmailVerification(current()); },
    resetPassword({email}) { return sdk.sendPasswordResetEmail(auth, email); },
    async changePassword({currentPassword, newPassword}) {
      const user = await reauthenticate(currentPassword);
      await sdk.updatePassword(user, newPassword);
      await sdk.getIdToken(user, true);
    },
    async revokeOtherSessions({password}) {
      const user = await reauthenticate(password);
      await accountRequest('/v1/account/revoke-sessions', 'POST', {});
      await reauthenticate(password);
      return refresh(user);
    },
    logout() { return sdk.signOut(auth); },
    async deleteAccount({password} = {}) {
      const user = password ? await reauthenticate(password) : current();
      await accountRequest('/v1/account', 'DELETE', {confirm: true});
      storage?.removeItem?.('lumia.engine.dev.v1:account:' + encodeURIComponent(user.uid));
      await sdk.signOut(auth);
    },
    async getIdToken() {
      const user = current();
      if (!user.emailVerified) throw Object.assign(new Error('Email verification required'), {code: 'FORBIDDEN'});
      return sdk.getIdToken(user);
    },
  };
}
