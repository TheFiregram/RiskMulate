import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.match(html, /PLAYABLE OPERATIONS PROTOTYPE/i);
  assert.match(html, /Restart East Filtration/i);
  assert.match(html, /Run guided demo/i);
  assert.match(html, /Walk the floor/i);
  assert.match(html, /Plant network/i);
  assert.doesNotMatch(html, /codex-preview/i);
});

test("includes the physical F-201 field interaction", async () => {
  const [scene, experience, scenario] = await Promise.all([
    readFile(new URL("../app/factory-scene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/factory-experience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/scenario-data.ts", import.meta.url), "utf8"),
  ]);

  assert.match(scene, /F-201 physical filter skid/i);
  assert.match(scene, /F-201 route beacon/i);
  assert.match(experience, /Begin F-201 field inspection/i);
  assert.match(experience, /FILTER-CONTROL/i);
  assert.match(experience, /SHIFT COMPLETE · TWO CONNECTED INCIDENTS/i);
  assert.match(experience, /Arm controlled backwash/i);
  assert.match(experience, /P‑204 → P‑205 TRANSFER/i);
  assert.match(experience, /Complete the P-205 transfer/i);
  assert.match(scene, /P-205 physical start console/i);
  assert.match(scene, /P-204 physical isolation valve/i);
  assert.match(scene, /hero\.fallbackBody\.visible = false/i);
  assert.match(scenario, /P205-START/i);
  assert.match(scenario, /Inlet and outlet gauge panel/i);
  assert.match(scenario, /Clean-bed pressure proves at 1\.1 bar/i);
});
