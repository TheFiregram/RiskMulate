import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('offline artifact bundles all imported modules and boot resources', async () => {
  const meta = JSON.parse(await readFile(new URL('dist/build-meta.json', root), 'utf8'));
  const external = Object.values(meta.outputs).flatMap(output => output.imports)
    .filter(item => item.external && !item.path.startsWith('data:'));
  assert.deepEqual(external, []);
  const html = await readFile(new URL('dist/index.html', root), 'utf8');
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)=["']https?:/i);
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^\"]+)"/g)) {
    await access(new URL(`dist/${match[1]}`, root));
  }
});

test('all scene model, texture and environment paths ship locally', async () => {
  const scene = await readFile(new URL('app/factory-scene.tsx', root), 'utf8');
  const paths = [...scene.matchAll(/["'](\/(?:models|hdri|textures)\/[^"']+)["']/g)].map(match => match[1]);
  assert.ok(paths.length > 0);
  for (const path of paths) await access(new URL(`dist${path}`, root));
});
