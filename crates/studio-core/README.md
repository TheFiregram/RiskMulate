# Studio Core

`riskmulator-studio-core` owns the local SQLite schema and CRUD repository for user profiles, workspaces, and scenarios. It has no dependency on Tauri, the presentation layer, any engine, or network client.

The public `Database` API validates names and scenario JSON, applies migrations on open, enforces foreign keys, and serializes access through a mutex. Use `Database::in_memory` for isolated tests.
