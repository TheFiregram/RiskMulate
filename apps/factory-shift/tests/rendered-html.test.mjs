import assert from "node:assert/strict";
import test from "node:test";

test("renders the production simulation shell", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>RiskMulate \| Factory Shift<\/title>/i);
  assert.match(html, /RISKMULATE · SCENARIO 01/i);
  assert.match(html, /Restart East Filtration/i);
  assert.match(html, /Guided presentation/i);
  assert.match(html, /Plant network/i);
  assert.doesNotMatch(html, /codex-preview/i);
});
