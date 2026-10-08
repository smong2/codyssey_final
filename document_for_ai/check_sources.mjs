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
const changes = [];
const missing = [];

async function sha256File(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
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

for (const source of manifest.sources) {
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

if (!changes.length) {
  console.log('SYNC OK: 기록 이후 팀 문서와 이미지 자원에 변경이 없습니다.');
  process.exit(0);
}

for (const { source } of changes) {
  console.log(`CHANGED ${source.path} → 다시 읽을 AI 문서: ${source.ai.join(', ')}`);
}

if (!record) {
  console.error('원문을 다시 읽고 요약을 검토하세요. 문서 갱신 작업에서만 검토 후 --record를 사용하세요.');
  process.exit(1);
}

for (const { source, current } of changes) source.sha256 = current;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log('변경 확인 기준을 갱신했습니다. 관련 AI 요약을 검토했다는 뜻으로만 사용하세요.');
