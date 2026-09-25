// Compatibility for existing build configurations: ship the active 3D game.
import { execFileSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
const factory = fileURLToPath(new URL("../../factory-shift/", import.meta.url));
const output = fileURLToPath(new URL("../dist/", import.meta.url));
execFileSync(
  process.execPath,
  [fileURLToPath(new URL("../../factory-shift/scripts/build-offline.mjs", import.meta.url))],
  { stdio: "inherit" },
);
rmSync(output, { recursive: true, force: true });
cpSync(`${factory}/dist`, output, { recursive: true });
