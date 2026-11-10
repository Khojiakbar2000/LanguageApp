// MCP SDK exports use ESM subpaths that eslint's default resolver cannot resolve.
/* eslint-disable import/no-unresolved */
import { Buffer } from 'node:buffer';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const client = new Client({ name: 'haru-panda-builder', version: '1.0.0' });
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('node_modules/rive-mcp-server/dist/index.js')],
    stderr: 'inherit',
  }),
);
try {
  const [name, input] = process.argv.slice(2);
  if (name === 'list') {
    const result = await client.listTools();
    await writeFile('/tmp/haru-rive-tools.json', JSON.stringify(result, null, 2));
    console.log(
      result.tools.map((t) => ({ name: t.name, description: t.description.slice(0, 100) })),
    );
  } else {
    const result = await client.callTool(
      { name, arguments: input ? JSON.parse(await readFile(input, 'utf8')) : {} },
      undefined,
      { timeout: 180000 },
    );
    await writeFile('/tmp/haru-rive-result.json', JSON.stringify(result));
    let i = 0;
    for (const c of result.content ?? []) {
      if (c.type === 'text') console.log(c.text);
      else if (c.type === 'image') {
        const out = `/tmp/haru-rive-${i++}.png`;
        await writeFile(out, Buffer.from(c.data, 'base64'));
        console.log('Preview:', out);
      }
    }
    if (result.isError) process.exitCode = 1;
  }
} finally {
  await client.close();
}
