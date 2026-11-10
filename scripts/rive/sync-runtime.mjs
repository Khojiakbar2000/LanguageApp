import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { copyFile, mkdir } from 'node:fs/promises';
const resolveFromReact = createRequire(import.meta.resolve('@rive-app/react-canvas'));
const runtimeDir = dirname(resolveFromReact.resolve('@rive-app/canvas'));
await mkdir('public/mascot', { recursive: true });
await copyFile(join(runtimeDir, 'rive.wasm'), 'public/mascot/rive.wasm');
console.log('Synced the WASM matching the React runtime.');
