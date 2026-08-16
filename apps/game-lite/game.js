/**
 * Self-extracting game core
 * -------------------------
 * Fetches gzip+base64 plant module, inflates, rewrites relative imports to
 * same-origin absolute URLs, then dynamic-imports the native game.
 * Exports `gameReady` so bootstrap can wait for RiskMulateScene before
 * attaching rear-gate / billboard.
 */
const CORE_B64_URL = new URL('./game-core.b64', import.meta.url).href;

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function inflateGzip(bytes) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('DecompressionStream unavailable on this browser');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

function rewriteModuleSpecifiers(code, baseHref) {
  const abs = (rel) => {
    try {
      return new URL(rel, baseHref).href;
    } catch {
      return rel;
    }
  };
  code = code.replace(
    /from\s+(['"])(\.\/?[^'"]+)\1/g,
    (match, quote, rel) => `from ${quote}${abs(rel)}${quote}`,
  );
  code = code.replace(
    /import\s+(['"])(\.\/?[^'"]+)\1\s*;/g,
    (match, quote, rel) => `import ${quote}${abs(rel)}${quote};`,
  );
  return code;
}

async function boot() {
  const response = await fetch(CORE_B64_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('game-core.b64 missing (' + response.status + ')');
  const text = (await response.text()).trim();
  const bytes = b64ToBytes(text);
  let code = await inflateGzip(bytes);
  const baseHref = new URL('./', import.meta.url).href;
  code = rewriteModuleSpecifiers(code, baseHref);
  const blob = new Blob([code], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  await import(url);
  window.__riskmulateGameModuleUrl = url;
  if (!window.RiskMulateScene?.scene) {
    throw new Error('Native core loaded but RiskMulateScene is missing');
  }
}

export const gameReady = boot().catch((error) => {
  console.error('[RiskMulate] self-extracting game boot failed', error);
  const el = document.createElement('div');
  el.setAttribute('role', 'alert');
  el.style.cssText =
    'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;padding:12px;background:#2a1010;color:#f2d6d6;border-radius:8px;font:12px/1.4 system-ui';
  el.textContent =
    'Game failed to start. Hard-refresh. If this continues, report a boot failure.';
  document.body.appendChild(el);
  throw error;
});
