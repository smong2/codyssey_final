import {initializeApp} from 'firebase/app';
import * as authSdk from 'firebase/auth';
import {createFirebaseAccountService} from './firebase-account.mjs';
import {installLumiaApiProvider} from './api-provider.mjs';

async function launch() {
  const response = await fetch('./runtime-config.json', {cache: 'no-store'});
  if (response.status === 404) {
    await import(new URL('./src/preview-main.mjs', location.href).href);
    return;
  }
  if (!response.ok) throw new Error('게임 연결 설정을 불러오지 못했습니다.');
  const config = await response.json();
  const {apiBaseUrl, firebase} = config;
  if (!firebase || !['apiKey', 'authDomain', 'projectId', 'appId'].every(key =>
    typeof firebase[key] === 'string' && firebase[key].trim()) ||
    typeof apiBaseUrl !== 'string' || !/^https?:\/\//.test(apiBaseUrl))
    throw new Error('게임 연결 설정이 올바르지 않습니다.');
  const auth = authSdk.getAuth(initializeApp(firebase));
  auth.languageCode = 'ko';
  if (config.authEmulatorUrl) authSdk.connectAuthEmulator(auth, config.authEmulatorUrl, {disableWarnings: true});
  const account = createFirebaseAccountService({auth, sdk: authSdk, apiBaseUrl});
  installLumiaApiProvider({baseUrl: apiBaseUrl, getIdToken: () => account.getIdToken()});
  globalThis.lumiaEngineServices.account = account;
  await import(new URL('./src/preview-main.mjs', location.href).href);
}

launch().catch(() => {
  const notice = document.querySelector('#notice');
  if (notice) notice.textContent = '게임 연결을 시작하지 못했습니다. 잠시 후 새로고침해 주세요.';
});
