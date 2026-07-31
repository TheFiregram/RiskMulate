# Core Modules

Each folder is an independent Rust library crate. Milestone 1 implements local persistence in `studio-core` and a lifecycle-only Simulation Engine; all other engine crates remain empty marker interfaces.

| Crate | Boundary |
| --- | --- |
| `studio-core` | Local user, workspace, and scenario persistence |
| `simulation-engine` | Deterministic lifecycle skeleton |
| `rule-engine` | Configurable rule evaluation |
| `event-engine` | Deterministic event scheduling and dispatch |
| `asset-engine` | Simulated asset definitions and state |
| `ai-engine` | Sandboxed AI actor coordination |
| `plugin-manager` | Offline extension discovery and lifecycle |
| `analytics-engine` | Locally computed exercise measurements |
| `replay-engine` | Seeded exercise replay |
| `reporting-engine` | Offline report production |

Crates do not depend on the Tauri shell or on one another. Future dependencies must point inward through explicit, versioned contracts; infrastructure adapters must remain outside domain interfaces.
