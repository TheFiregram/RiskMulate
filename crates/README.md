# Core Modules

Each folder is an independent Rust library crate exposing a deliberately empty interface. The interfaces establish compile-time module boundaries without committing to behavior before the requirements are approved.

| Crate | Boundary |
| --- | --- |
| `simulation-engine` | Deterministic simulation orchestration |
| `rule-engine` | Configurable rule evaluation |
| `event-engine` | Deterministic event scheduling and dispatch |
| `asset-engine` | Simulated asset definitions and state |
| `ai-engine` | Sandboxed AI actor coordination |
| `plugin-manager` | Offline extension discovery and lifecycle |
| `analytics-engine` | Locally computed exercise measurements |
| `replay-engine` | Seeded exercise replay |
| `reporting-engine` | Offline report production |

Crates do not depend on the Tauri shell or on one another. Future dependencies must point inward through explicit, versioned contracts; infrastructure adapters must remain outside domain interfaces.
