# Tests

Repository-level test suites are grouped by assurance goal. Module-local tests should remain with their owning module when a technology layout is selected.

- `unit/` — isolated behavior checks.
- `integration/` — module-contract and composition checks.
- `determinism/` — seed, replay, ordering, and reproducibility checks.
- `safety/` — sandbox, isolation, and prohibited-integration checks.

The empty suites establish boundaries only; no test behavior is implemented yet.
