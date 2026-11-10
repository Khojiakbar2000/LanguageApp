/* eslint-disable import/no-unresolved */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
execFileSync('python3', ['scripts/rive/prepare-panda-v2.py'], { stdio: 'inherit' });
const client = new Client({ name: 'haru-panda-import', version: '2.0.0' });
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('node_modules/rive-mcp-server/dist/index.js')],
    stderr: 'inherit',
  }),
);
try {
  for (const [svgPath, outSpec, idPrefix] of [
    [
      'public/mascot/panda_rive_v2_assets/panda_rig_v2.svg',
      'src/panda_rive_assets/panda.import.json',
      'v2',
    ],
    [
      'src/panda_rive_assets/panda-v2-wearables.svg',
      'src/panda_rive_assets/accessories.import.json',
      'wear',
    ],
  ]) {
    const result = await client.callTool(
      {
        name: 'riv_import_svg',
        arguments: { svgPath: path.resolve(svgPath), outSpec: path.resolve(outSpec), idPrefix },
      },
      undefined,
      { timeout: 180000 },
    );
    const details = result.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');
    if (result.isError) throw new Error(details);
    console.log(details);
  }
  const source = JSON.parse(await readFile('src/panda_rive_assets/panda.import.json', 'utf8'));
  if (source.sourceWidth !== 800 || source.sourceHeight !== 800 || source.shapes.length !== 38)
    throw new Error(
      'V2 source structure changed. Review its named joint mapping before rebuilding.',
    );
  console.log('Imported all supplied V2 vectors, including hidden expression variants.');
} finally {
  await client.close();
}
