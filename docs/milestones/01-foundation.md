# Milestone 1 — Local Application Foundation

**Status:** Implemented

## Scope

Milestone 1 supplies the smallest end-to-end offline workflow:

1. Create, rename, list, select, and delete local user profiles.
2. Create, rename, list, select, and delete workspaces owned by a profile.
3. Create, edit, list, and delete scenarios inside a workspace.
4. Start a deterministic simulation lifecycle skeleton from a stored scenario and seed.
5. Persist application records in a local SQLite database under Tauri's application-data directory.

A user is a local profile, not an authentication principal. No password, token, biometric, external identity, or authorization claim is collected in this milestone.

## Architecture

The React interface calls a narrow set of Tauri commands. The desktop composition root owns a thread-safe SQLite repository and an in-memory Simulation Engine. Persistence is isolated in `riskmulator-studio-core`; simulation lifecycle state is isolated in `riskmulator-simulation-engine`. Neither module can initiate network access.

SQLite starts with foreign keys enabled, a bounded busy timeout, a recorded schema migration, JSON validation, ownership foreign keys, cascade cleanup, and stable list ordering. The schema stores only synthetic Studio records:

```text
users 1 ── * workspaces 1 ── * scenarios
```

The Simulation Engine implements lifecycle validation (`ready`, `running`, `paused`, `completed`), seed retention, and monotonic ticks. It intentionally does not evaluate scenario configuration, rules, events, assets, actors, analytics, replay data, or reports yet.

## Data location and deletion

The desktop host creates `riskmulator-studio.sqlite3` in the operating system application-data directory resolved by Tauri. Deleting a user cascades to owned workspaces and scenarios; deleting a workspace cascades to its scenarios. Uninstall and backup behavior remains operating-system dependent and must be specified in a later milestone.

## Safety boundaries

- There are no HTTP clients, network plugins, production endpoints, or external database drivers.
- Scenario configuration must be a JSON object and remains local.
- The content security policy permits packaged application resources only.
- Database errors are returned to the interface without panics.
- Simulation runs are in memory and never interact with outside systems.

## Verification

Rust tests cover persistence across reopen, complete CRUD round trips, validation, cascade deletion, valid lifecycle progression, and invalid lifecycle rejection. React tests mock the Tauri boundary and cover the initial local workflow and user creation command.
