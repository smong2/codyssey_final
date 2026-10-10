#!/usr/bin/env node

// Read-only by default. --record accepts the current source state only after human/AI review.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'document_for_ai/source_manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const record = process.argv.includes('--record');
const addUntracked = process.argv.includes('--add-untracked');
const changes = [];
const missing = [];
const untrackedSources = [];
const assetReadmeIssues = [];
const manifestIssues = [];

async function sha256File(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

async function collectFiles(directory, predicate, relative = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const nextRelative = path.posix.join(relative, entry.name);
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(fullPath, predicate, nextRelative));
    else if (entry.isFile() && predicate(entry.name, nextRelative)) files.push(nextRelative);
  }
  return files;
}

async function discoverManagedSources() {
  const discovered = new Set(manifest.discovery?.fixedFiles ?? []);

  for (const area of manifest.discovery?.markdownTrees ?? []) {
    const areaPath = path.join(root, area);
    try {
      const markdownFiles = await collectFiles(areaPath, (name) => name.endsWith('.md'));
      for (const markdownFile of markdownFiles) discovered.add(path.posix.join(area, markdownFile));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  for (const area of manifest.discovery?.readmeTrees ?? []) {
    const areaPath = path.join(root, area);
    try {
      const readmes = await collectFiles(areaPath, (name) => name === 'README.md');
      for (const readme of readmes) discovered.add(path.posix.join(area, readme));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  return discovered;
}

function routeAiFor(sourcePath) {
  for (const route of manifest.routes ?? []) {
    if (route.path && route.path !== sourcePath) continue;
    if (route.prefix && !sourcePath.startsWith(route.prefix)) continue;
    if (route.filename && path.posix.basename(sourcePath) !== route.filename) continue;
    if (route.extension && path.posix.extname(sourcePath) !== route.extension) continue;
    return route.ai ?? [];
  }
  return [];
}

async function validateManifest() {
  if (manifest.schemaVersion !== 2) {
    manifestIssues.push(`지원하지 않는 schemaVersion: ${manifest.schemaVersion}`);
    return;
  }

  if (!Array.isArray(manifest.trackedFiles)) manifestIssues.push('trackedFiles가 배열이 아닙니다.');
  if (!Array.isArray(manifest.routes)) manifestIssues.push('routes가 배열이 아닙니다.');
  if (!manifest.discovery || typeof manifest.discovery !== 'object') manifestIssues.push('discovery 설정이 없습니다.');
  if (!manifest.assetInventory || typeof manifest.assetInventory !== 'object') manifestIssues.push('assetInventory 설정이 없습니다.');
  if (manifestIssues.length) return;

  for (const key of ['fixedFiles', 'markdownTrees', 'readmeTrees']) {
    if (!Array.isArray(manifest.discovery[key])) manifestIssues.push(`discovery.${key}가 배열이 아닙니다.`);
  }
  if (manifestIssues.length) return;

  const seenTracked = new Set();
  for (const source of manifest.trackedFiles) {
    if (!source?.path || typeof source.path !== 'string') {
      manifestIssues.push('trackedFiles에 path가 없는 항목이 있습니다.');
      continue;
    }
    if (seenTracked.has(source.path)) manifestIssues.push(`중복 trackedFiles.path: ${source.path}`);
    seenTracked.add(source.path);
    if (!/^[a-f0-9]{64}$/.test(source.sha256 ?? '')) manifestIssues.push(`잘못된 sha256: ${source.path}`);
    if (!routeAiFor(source.path).length) manifestIssues.push(`AI route 없음: ${source.path}`);
  }

  for (const route of manifest.routes) {
    if (!route.path && !route.prefix && !route.filename && !route.extension) {
      manifestIssues.push(`선택 조건이 없는 route: ${JSON.stringify(route)}`);
    }
    if (!Array.isArray(route.ai) || !route.ai.length) {
      manifestIssues.push(`AI 대상이 없는 route: ${JSON.stringify(route)}`);
      continue;
    }
    for (const aiPath of route.ai) {
      try {
        if (!(await stat(path.join(root, aiPath))).isFile()) manifestIssues.push(`AI route 대상이 파일이 아님: ${aiPath}`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        manifestIssues.push(`존재하지 않는 AI route 대상: ${aiPath}`);
      }
    }
  }

  if (!manifest.assetInventory.path || typeof manifest.assetInventory.path !== 'string') {
    manifestIssues.push('assetInventory.path가 없습니다.');
  }
  if (!/^[a-f0-9]{64}$/.test(manifest.assetInventory.sha256 ?? '')) {
    manifestIssues.push('assetInventory.sha256 형식이 잘못되었습니다.');
  }
  if (!Array.isArray(manifest.assetInventory.ai) || !manifest.assetInventory.ai.length) {
    manifestIssues.push('assetInventory.ai가 비어 있거나 배열이 아닙니다.');
  }
  for (const aiPath of manifest.assetInventory.ai ?? []) {
    try {
      if (!(await stat(path.join(root, aiPath))).isFile()) manifestIssues.push(`assetInventory AI 대상이 파일이 아님: ${aiPath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      manifestIssues.push(`존재하지 않는 assetInventory AI 대상: ${aiPath}`);
    }
  }
}

async function imageInventoryHash(directory) {
  const names = [];
  async function walk(current, relative = '') {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'README.md') continue;
      const nextRelative = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await walk(path.join(current, entry.name), nextRelative);
      else if (entry.isFile()) names.push(nextRelative);
    }
  }
  await walk(directory);
  names.sort();
  const aggregate = createHash('sha256');
  for (const name of names) {
    aggregate.update(name).update('\0');
    aggregate.update(await sha256File(path.join(directory, name))).update('\n');
  }
  return aggregate.digest('hex');
}

async function validateAssetReadmes(assetRoot) {
  for (const entry of await readdir(assetRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const categoryPath = path.join(assetRoot, entry.name);
    const readmePath = path.join(categoryPath, 'README.md');
    let readme;
    try {
      readme = await readFile(readmePath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      assetReadmeIssues.push(`${entry.name}/README.md 없음`);
      continue;
    }

    const files = (await readdir(categoryPath, { withFileTypes: true }))
      .filter((item) => item.isFile() && !item.name.startsWith('.') && item.name !== 'README.md')
      .map((item) => item.name)
      .sort();

    for (const file of files) {
      if (!readme.includes(file)) assetReadmeIssues.push(`${entry.name}/${file} → README 목록에 없음`);
    }

    const localPreviewPattern = /(?:src=|\]\()(["']?\.\/[^"')\s>]+)["']?/g;
    for (const match of readme.matchAll(localPreviewPattern)) {
      const referenced = match[1].replace(/^['"]|['"]$/g, '').replace(/^\.\//, '');
      if (!files.includes(referenced)) {
        assetReadmeIssues.push(`${entry.name}/README.md → 존재하지 않는 로컬 파일 참조: ${referenced}`);
      }
    }
  }
}

if (record && addUntracked) {
  console.error('--record와 --add-untracked는 동시에 사용할 수 없습니다.');
  process.exit(2);
}

await validateManifest();
if (manifestIssues.length) {
  for (const issue of manifestIssues) console.error(`MANIFEST ${issue}`);
  console.error('source_manifest.json의 구조·경로·해시를 먼저 수정하세요.');
  process.exit(2);
}

const trackedSources = new Set(manifest.trackedFiles.map((source) => source.path));
for (const discovered of await discoverManagedSources()) {
  if (!trackedSources.has(discovered)) untrackedSources.push(discovered);
}

if (addUntracked && untrackedSources.length) {
  const unroutable = untrackedSources.filter((sourcePath) => !routeAiFor(sourcePath).length);
  if (unroutable.length) {
    for (const item of unroutable.sort()) console.error(`UNROUTED ${item}`);
    console.error('AI route가 없는 새 문서는 자동 등록하지 않습니다. routes를 먼저 추가하세요.');
    process.exit(1);
  }

  for (const sourcePath of untrackedSources.sort()) {
    manifest.trackedFiles.push({
      path: sourcePath,
      sha256: await sha256File(path.join(root, sourcePath))
    });
    console.log(`ADDED ${sourcePath} → AI 문서: ${routeAiFor(sourcePath).join(', ')}`);
  }
  manifest.trackedFiles.sort((a, b) => a.path.localeCompare(b.path));
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  untrackedSources.length = 0;
  console.log('새 관리 문서를 trackedFiles에 등록했습니다. AI 요약을 검토한 뒤 일반 검사를 다시 실행하세요.');
}

for (const source of manifest.trackedFiles) {
  try {
    const current = await sha256File(path.join(root, source.path));
    if (current !== source.sha256) changes.push({ source, current });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    missing.push(source.path);
  }
}

try {
  const assetPath = path.join(root, manifest.assetInventory.path);
  if (!(await stat(assetPath)).isDirectory()) throw new Error('자원 경로가 디렉터리가 아닙니다.');
  const current = await imageInventoryHash(assetPath);
  await validateAssetReadmes(assetPath);
  if (current !== manifest.assetInventory.sha256) {
    changes.push({ source: manifest.assetInventory, current });
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  missing.push(manifest.assetInventory.path);
}

if (missing.length) {
  for (const item of missing) console.error(`UNAVAILABLE ${item}`);
  console.error('원문·자원이 없는 환경에서는 최신 여부를 자동 확인할 수 없습니다. AI 문서를 스냅샷으로 사용하세요.');
  process.exit(2);
}

if (untrackedSources.length) {
  for (const item of untrackedSources.sort()) {
    const ai = routeAiFor(item);
    const suffix = ai.length ? ` → 권장 AI 문서: ${ai.join(', ')}` : '';
    console.error(`UNTRACKED ${item}${suffix}`);
  }
  console.error('새 관리 문서가 source_manifest.json에 등록되지 않았습니다. AI 연결 대상을 정해 manifest에 추가하세요.');
}

if (assetReadmeIssues.length) {
  for (const issue of assetReadmeIssues) console.error(`ASSET README ${issue}`);
  console.error('asset 실제 파일과 카테고리 README의 목록·미리보기를 동기화하세요.');
}

if (untrackedSources.length || assetReadmeIssues.length) process.exit(1);

if (!changes.length) {
  console.log('SYNC OK: 기록 이후 팀 문서와 이미지 자원에 변경이 없고 관리 대상·asset README도 일치합니다.');
  process.exit(0);
}

for (const { source } of changes) {
  const ai = source.ai ?? routeAiFor(source.path);
  const suffix = ai.length ? ` → 다시 읽을 AI 문서: ${ai.join(', ')}` : '';
  console.log(`CHANGED ${source.path}${suffix}`);
}

if (!record) {
  console.error('원문을 다시 읽고 요약을 검토하세요. 문서 갱신 작업에서만 검토 후 --record를 사용하세요.');
  process.exit(1);
}

for (const { source, current } of changes) source.sha256 = current;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log('변경 확인 기준을 갱신했습니다. 관련 AI 요약을 검토했다는 뜻으로만 사용하세요.');
