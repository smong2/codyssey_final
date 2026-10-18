import {build} from 'vite';
import {cp, copyFile, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const output = path.join(root, 'web-dist');
const required = name => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the Vercel build`);
  return value;
};
const apiBaseUrl = required('VITE_API_BASE_URL').replace(/\/+$/, '');
const firebase = {
  apiKey: required('VITE_FIREBASE_API_KEY'),
  authDomain: required('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: required('VITE_FIREBASE_PROJECT_ID'),
  appId: required('VITE_FIREBASE_APP_ID'),
};
const localTest = process.env.LUMIA_LOCAL_TEST === '1';
if (localTest ? !/^http:\/\/127\.0\.0\.1:\d+$/.test(apiBaseUrl)
  : !/^https:\/\/[^/]+$/.test(apiBaseUrl))
  throw new Error('VITE_API_BASE_URL must be the expected API origin');
if (firebase.projectId !== (localTest ? 'demo-lumia-phase12' : 'codyssey-final'))
  throw new Error('Firebase project ID does not match the build environment');
if (!firebase.authDomain.endsWith('.firebaseapp.com')) throw new Error('Firebase Auth domain is invalid');
const authEmulatorUrl = localTest ? required('VITE_FIREBASE_AUTH_EMULATOR_URL') : undefined;
if (authEmulatorUrl && !/^http:\/\/127\.0\.0\.1:\d+$/.test(authEmulatorUrl))
  throw new Error('Auth Emulator URL must be a loopback origin');

await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
for (const file of ['style.css', 'preview.css'])
  await copyFile(path.join(root, 'engine', file), path.join(output, file));
await cp(path.join(root, 'engine/src'), path.join(output, 'src'), {recursive: true});
await cp(path.join(root, 'engine/minigame-demo/src'), path.join(output, 'minigame-demo/src'), {recursive: true});
await mkdir(path.join(output, 'minigame-demo/vendor'), {recursive: true});
await copyFile(path.join(root, 'engine/minigame-demo/vendor/phaser.min.js'),
  path.join(output, 'minigame-demo/vendor/phaser.min.js'));

const html = await readFile(path.join(root, 'engine/index.html'), 'utf8');
const entry = '<script type="module" src="./src/preview-main.mjs"></script>';
if (!html.includes(entry)) throw new Error('Engine entry point changed; review the web packaging');
await writeFile(path.join(output, 'index.html'), html.replace(entry,
  '<script type="module" src="./bootstrap.js"></script>'));

async function copyAssetCategory(category, target, extensions) {
  const source = path.join(root, 'asset', category);
  const destination = path.join(output, target);
  await mkdir(destination, {recursive: true});
  for (const item of await readdir(source, {withFileTypes: true})) {
    if (item.isFile() && extensions.includes(path.extname(item.name).toLowerCase()))
      await copyFile(path.join(source, item.name), path.join(destination, item.name));
  }
}
await copyAssetCategory('background', 'world-assets', ['.png']);
await copyAssetCategory('character', 'character-assets', ['.png']);
for (const category of ['ui', 'effect', 'pet', 'map', 'font_files', 'item', 'badge', 'sd_character', 'puzzle'])
  await copyAssetCategory(category, `design-assets/${category}`, ['.png', '.webp', '.svg', '.woff2']);
await mkdir(path.join(output, 'sd-assets'), {recursive: true});
for (const item of await readdir(path.join(root, 'prototype/assets'))) {
  if (/^SD03_(?:S|SW|W|NW|N|NE|E|SE)_strip\.png$/.test(item))
    await copyFile(path.join(root, 'prototype/assets', item), path.join(output, 'sd-assets', item));
}
await copyFile(path.join(root, 'prototype/assets/intro.mp4'), path.join(output, 'intro.mp4'));
await mkdir(path.join(output, 'audio-assets'), {recursive: true});
for (const file of ['bgm_title_intro.mp3', 'bgm_title_main.mp3', 'bgm_admission_invitation.mp3',
  'bgm_myroom.mp3', 'sfx_button_click.mp3', 'sfx_diary_open.mp3']) {
  const folder = file.startsWith('bgm_') ? 'bgm' : 'sfx';
  await copyFile(path.join(root, 'asset/audio', folder, file), path.join(output, 'audio-assets', file));
}

await writeFile(path.join(output, 'runtime-config.json'),
  JSON.stringify({apiBaseUrl, firebase, ...(authEmulatorUrl ? {authEmulatorUrl} : {})}));
await build({
  configFile: false,
  root,
  publicDir: false,
  logLevel: 'error',
  build: {
    outDir: output,
    emptyOutDir: false,
    target: 'es2022',
    minify: true,
    lib: {
      entry: path.join(root, 'engine/src/services/browser-bootstrap.mjs'),
      formats: ['es'],
      fileName: () => 'bootstrap.js',
    },
  },
});
console.log('LUMIA web output prepared:', output);
