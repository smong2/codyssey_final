import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {assetReference} from '../src/core/asset-paths.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const worldBackgrounds = resolve(root, '../../asset/background');
const port = Number(process.env.LUMIA_MINIGAME_PORT || 4174);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const worldAsset = pathname.startsWith('/world-assets/');
    const path = worldAsset
      ? resolve(worldBackgrounds, assetReference('background',pathname.slice('/world-assets/'.length)).file)
      : resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    const allowedRoot = worldAsset ? worldBackgrounds : root;
    if (path !== allowedRoot && !path.startsWith(allowedRoot + sep)) throw new Error('outside root');
    if (worldAsset && extname(path) !== '.png') throw new Error('not a background');
    if (!(await stat(path)).isFile()) throw new Error('not a file');
    response.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(await readFile(path));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`LUMIA 미니게임 데모: http://127.0.0.1:${port}/`));
