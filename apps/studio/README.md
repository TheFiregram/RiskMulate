# Studio Desktop Application

The Studio application is a [Tauri 2](https://tauri.app/) desktop shell with a React and TypeScript user interface and a Rust host. It composes core crates but does not own simulation business rules.

## Boundaries

- `src/` contains the React presentation shell and its tests.
- `src-tauri/` contains desktop lifecycle and packaging configuration.
- The shell has no network plugins or production-system integrations.
- Engine behavior belongs in the independent crates under `crates/`.

The current screen is a foundation status view only. It does not execute simulations.
