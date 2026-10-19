import {initializeApp} from 'firebase/app';
import * as authSdk from 'firebase/auth';
import {createFirebaseAccountService} from './firebase-account.mjs';
import {installLumiaApiProvider} from './api-provider.mjs';
import {waitForApiReady} from './api-health.mjs';

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
  const notice = document.querySelector('#notice');
  if (notice) notice.textContent = '게임 서버를 준비하고 있습니다.';
  const apiReady = waitForApiReady({
    baseUrl: apiBaseUrl,
    onAttempt: attempt => {
      if (notice && attempt > 1) notice.textContent = '게임 서버를 깨우고 있습니다. 잠시만 기다려 주세요.';
    },
  });
  const auth = authSdk.getAuth(initializeApp(firebase));
  auth.languageCode = 'ko';
  if (config.authEmulatorUrl) authSdk.connectAuthEmulator(auth, config.authEmulatorUrl, {disableWarnings: true});
  const account = createFirebaseAccountService({auth, sdk: authSdk, apiBaseUrl});
  await apiReady;
  installLumiaApiProvider({baseUrl: apiBaseUrl, getIdToken: options => account.getIdToken(options)});
  globalThis.lumiaEngineServices.account = account;
  if (notice) notice.textContent = '';
  await import(new URL('./src/preview-main.mjs', location.href).href);
}

launch().catch(() => {
  const notice = document.querySelector('#notice');
  if (notice) notice.textContent = '게임 연결을 시작하지 못했습니다. 잠시 후 새로고침해 주세요.';
});
