# RiskMulator Studio

RiskMulator Studio is an offline-capable browser-based Three.js serious game. The player directs Aegis Dynamics through the insider-risk crisis **Operation Black Ledger**. React renders only the HUD and menus; the command centre has its own Three.js scene, camera, input, lighting, and animation loop.

## Browser architecture

- **Runtime:** Vite, TypeScript, and a Three.js WebGL scene.
- **HUD:** React 19 for readable overlays, station panels, dialogue, settings, and debrief.
- **Scenario:** typed evidence, actions, consequences, risk state, and branching endings.
- **Persistence:** browser localStorage; no native database is required.
- **Desktop:** the historical Tauri host remains optional legacy packaging and is not needed to develop, build, or play the game.
- **Quality:** Low, Medium, and High render scales, capped pixel ratio, reduced motion, static station navigation, Vitest, ESLint, and TypeScript strict mode.

## Run the game

Node.js 22 and npm 10 or newer are the only required runtime prerequisites.

```bash
npm install
npm run dev
```

The production browser bundle is emitted at repository-root `dist/`:

```bash
npm run build
```

## Safety and dependency rules

1. Simulation execution must never require network access.
2. No production banks, wallets, payment rails, exchanges, APIs, or databases may be connected.
3. Core modules must remain deterministic and replayable where applicable.
4. Cross-module contracts and persisted schemas must be typed, documented, and versioned.
5. Plugins and AI capabilities must run behind explicit sandbox boundaries once specified.
6. Important actions must be locally auditable; telemetry must not export user or simulation data.
7. Scenario behavior belongs in validated configuration, not application source code.

## Quality checks

```bash
npm run format:check
npm run lint
npm test
npm run build
```

The installed browser simulation requires no network connection.

## RiskMulator Studio game

The Studio now launches into **Operation Black Ledger**, an offline corporate-crisis simulation. Run `npm install` then `npm run dev` and open the displayed local URL. Assume command, select the eight stations in the room, inspect and tag evidence, take operational actions, then convene the executive response to see the ending your decisions produced. Progress is saved locally in the browser.

Controls: click a station to focus it; use the pause control to stop simulation time; use the settings control for quality and accessibility preferences. The WebGL command centre is keyboard accessible and honours reduced-motion preferences.

### Media authoring

Future MP4/WebM scenes should be placed under `public/media/scenarios/operation-black-ledger/`. Scenario playback must define a procedural fallback before media is enabled so offline or missing assets never produce an empty panel. Keep scenario facts and consequences in `src/scenario.ts`, separate from the player interface.

### Current limitations

The game uses an offline Three.js-compatible WebGL runtime vendored in the repository because the build environment blocks public registries. Sound controls are present, but generated Web Audio ambience is not yet enabled. Save data uses localStorage and is device-local.
