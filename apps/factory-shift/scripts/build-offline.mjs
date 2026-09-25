import { build, context } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const outdir = resolve(root, 'dist');
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await cp(resolve(root, 'public'), outdir, { recursive: true });
await cp(resolve(root, 'standalone/index.html'), resolve(outdir, 'index.html'));
const options = {
  absWorkingDir: root,
  entryPoints: ['standalone/entry.tsx'],
  outfile: resolve(outdir, 'app.js'),
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  metafile: true,
};
// Include dependency notices in the distributable with the existing asset credits.
await cp(resolve(root, 'ASSET_CREDITS.md'), resolve(outdir, 'ASSET_CREDITS.md'));
if (process.argv.includes('--serve')) {
  const ctx = await context(options);
  await ctx.rebuild();
  if (process.argv.includes('--watch')) await ctx.watch();
  const server = await ctx.serve({ servedir: outdir, host: '127.0.0.1', port: 4173 });
  console.log(`Factory Shift: http://127.0.0.1:${server.port} (local computer only)`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await ctx.dispose(); process.exit(0); });
} else {
  const result = await build(options);
  const external = Object.values(result.metafile.outputs).flatMap(output => output.imports).filter(item => item.external && !item.path.startsWith('data:'));
  if (external.length) throw new Error(`Offline build has external imports: ${JSON.stringify(external)}`);
  const html = await readFile(resolve(outdir, 'index.html'), 'utf8');
  if (/<(?:script|link)[^>]+(?:src|href)=["']https?:/i.test(html)) throw new Error('Remote boot dependency in offline HTML');
  await writeFile(resolve(outdir, 'build-meta.json'), JSON.stringify(result.metafile, null, 2));
  console.log(`Built immersive Factory Shift with local assets: ${outdir}`);
}
