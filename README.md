# RiskMulator Studio

RiskMulator Studio is an offline-first desktop environment for safe risk-simulation training, education, and decision practice. The [Studio Bible](docs/studio-bible/README.md), governed by [Document 00](docs/studio-bible/00-project-charter.md), is the authoritative specification.

## Foundation status

Milestone 1 provides a working local workflow for user profiles, workspaces, scenario CRUD, and a deterministic Simulation Engine lifecycle skeleton. It intentionally contains no scenario evaluation rules, external integrations, production data, or live-system connectivity.

## Technology stack

- **Desktop:** Tauri 2, using the operating system webview for a small distributable and a Rust security boundary.
- **Interface:** React 19 and TypeScript 5, built by Vite.
- **Core:** Rust 2024 workspace crates with strict lint configuration and no unsafe code.
- **Dependency management:** npm workspaces for the interface and Cargo workspaces for the desktop host and core crates.
- **Quality:** Prettier, ESLint, TypeScript strict mode, Vitest, rustfmt, Clippy, and Cargo test.

Tauri keeps the application installable and executable offline, while the split workspace prevents presentation and desktop concerns from becoming simulation-domain dependencies.

## Architecture

```text
apps/
└── studio/
    ├── src/                 React presentation shell
    └── src-tauri/           Tauri desktop host and packaging
crates/
├── studio-core/             Local SQLite CRUD and migrations
├── simulation-engine/       Deterministic lifecycle skeleton
├── rule-engine/             Configurable rule interface
├── event-engine/            Event scheduling interface
├── asset-engine/            Simulated asset interface
├── ai-engine/               Sandboxed actor interface
├── plugin-manager/          Offline extension interface
├── analytics-engine/        Measurement interface
├── replay-engine/           Deterministic replay interface
└── reporting-engine/        Offline reporting interface
schemas/                     Reserved versioned data contracts
examples/                    Reserved synthetic scenario fixtures
tests/                       Reserved cross-cutting assurance suites
tools/                       Reserved offline development tooling
docs/studio-bible/           Governing specification
```

The Tauri host is the composition root. `studio-core` owns local SQLite persistence, while `simulation-engine` owns lifecycle state. The remaining core crates are framework-independent marker interfaces. Core crates do not depend on the desktop application. See the [Milestone 1 design](docs/milestones/01-foundation.md) for data ownership, lifecycle, and safety details.

## Safety and dependency rules

1. Simulation execution must never require network access.
2. No production banks, wallets, payment rails, exchanges, APIs, or databases may be connected.
3. Core modules must remain deterministic and replayable where applicable.
4. Cross-module contracts and persisted schemas must be typed, documented, and versioned.
5. Plugins and AI capabilities must run behind explicit sandbox boundaries once specified.
6. Important actions must be locally auditable; telemetry must not export user or simulation data.
7. Scenario behavior belongs in validated configuration, not application source code.

## Development

Prerequisites are Node.js 22 or newer, npm 10 or newer, the stable Rust toolchain, and the [Tauri platform prerequisites](https://tauri.app/start/prerequisites/) for the target operating system.

```bash
npm install
npm run tauri dev
```

Quality commands:

```bash
npm run format:check
npm run lint
npm test
npm run build
```

Dependency installation may require Internet access during development or packaging; the installed application and simulation runtime must not.
