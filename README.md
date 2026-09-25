# RiskMulate — Immersive Factory Training

The active game is **Factory Shift**, in `apps/factory-shift`. It is a single-player 3D factory risk simulation for students. The September 25, 2026 direction replaces the 2D isometric proposal and the broader multi-industry Studio product direction.

## Run the existing immersive game

Install Node.js 22.13 or newer, then run from the repository root:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. This address serves files from your own computer. It does not connect to a public game server. Dependency installation requires internet; after installation the local game build and gameplay do not.

```sh
npm run build
npm run preview
```

`apps/factory-shift/dist` contains the bundled application, models, textures and lighting assets. No CDN libraries are required during play. Serve this folder locally; opening its HTML through `file://` is not supported. Native Mac and Windows installers remain pending. Node is currently required for these developer commands.

## Current playable content

- First-person factory exploration with WASD and arrow controls.
- Pump and filter evidence collection, equipment controls and connected decisions.
- APEX-inspired menus, feedback, production outcomes and debrief.

## Approved next delivery

- Third-person character and free camera, workers and conversations.
- Food and beverage factory with three to five distinct risks.
- Fifteen to thirty minute shifts, save/resume and repeat play.
- Local report export with decisions, reasons, scores and consequences.
- Fully local Mac and Windows distribution, no accounts or multiplayer.
- Baseline test device: 2018 Intel MacBook Air, 8 GB RAM, UHD 617.

These are delivery targets, not completed features. Native packaging, save/resume, report export, third-person characters and Mac performance verification are still outstanding.

## Repository boundaries

- `apps/factory-shift`: active game source and offline build.
- `apps/game-lite`: earlier 3D systems and reusable factory assets; not the default entry point.
- `apps/studio` and `crates`: historical desktop foundation, available for packaging work. The compatibility Studio web build now bundles Factory Shift.
- `tools/blender`: existing model preparation scripts. Blender is not required to run the game.
- `docs/studio-bible`: historical broad-studio specifications. This README and the September 25 factory scope govern the active game.

The unmerged `rebuild/factory-risk-core` 2D experiment is retired. Do not merge its renderer or replace the immersive game with it.

Asset provenance is recorded in `apps/factory-shift/ASSET_CREDITS.md`.
