#!/usr/bin/env node

// Detect changes in team-facing source documents that require AI summaries to be re-read.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'document_for_ai', 'source_manifest.json');
const record = process.argv.includes('--record');

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const changed = [];

for (const source of manifest.sources) {
  const fullPath = path.join(root, source.path);
  let current;
  try {
    current = createHash('sha256').update(await readFile(fullPath)).digest('hex');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    current = null;
  }

  if (current !== source.sha256) {
    changed.push({ source, current });
    console.log(`CHANGED ${source.path} → 확인할 AI 문서: ${source.ai.join(', ')}`);
  }
}

if (!changed.length) {
  console.log('SYNC OK: 감시 중인 상세 문서에 기록 이후 변경이 없습니다.');
  process.exit(0);
}

if (record) {
  if (changed.some(({ current }) => current === null)) {
    console.error('누락된 파일이 있어 기록을 갱신하지 않았습니다.');
    process.exit(2);
  }
  for (const { source, current } of changed) source.sha256 = current;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log('기록 갱신 완료. 관련 AI 요약을 실제로 검토·수정한 뒤에만 --record를 사용하세요.');
  process.exit(0);
}

console.error('상세 문서를 다시 읽고 관련 AI 요약을 검토하세요. 문서 갱신 작업이라면 동기화 후 --record를 실행하세요.');
process.exit(1);
