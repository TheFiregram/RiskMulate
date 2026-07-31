# RiskMulator Studio Bible

The Studio Bible is the authoritative documentation set for RiskMulator Studio. All documents in this directory are governed by [Document 00 — Project Charter](./00-project-charter.md). If another Studio Bible document conflicts with the charter, the charter takes precedence.

## Document map

| Section | Purpose | Status |
| --- | --- | --- |
| [00 — Project Charter](./00-project-charter.md) | Mission, scope, principles, non-goals, and engineering standards | Foundational charter v0.1 |
| [01 — Product](./01-product/README.md) | Product definition, users, outcomes, capabilities, and roadmap | Prepared |
| [02 — Requirements](./02-requirements/README.md) | Functional and non-functional requirements and acceptance criteria | Prepared |
| [03 — Architecture](./03-architecture/README.md) | System context, boundaries, modules, interfaces, and deployment | Prepared |
| [04 — Security](./04-security/README.md) | Threat model, safety controls, privacy, and assurance | Prepared |
| [05 — Domain Model](./05-domain-model/README.md) | Domain entities, schemas, persistence, versioning, and migration | Prepared |
| [06 — Testing](./06-testing/README.md) | Test strategy, deterministic verification, quality gates, and evidence | Prepared |
| [07 — Implementation](./07-implementation/README.md) | Delivery sequencing, engineering conventions, and operational guidance | Prepared |

“Prepared” means that the section exists with an agreed scope but does not yet contain an approved specification.

## Governing rules

1. Read the project charter before authoring or reviewing any section.
2. Preserve the charter's offline-first, safety-first, deterministic, reproducible, configurable, measurable, and modular constraints.
3. Keep requirements uniquely identifiable and testable. Link design decisions and tests back to the requirements they satisfy.
4. Record assumptions and unresolved decisions explicitly; do not silently convert them into requirements.
5. Use relative links so the Bible remains usable without network access.
6. Do not place application code, generated artifacts, secrets, credentials, or production integration details in this directory.

## Document status

Each substantive document should declare one of these states near its title:

- **Draft** — under active development and not yet authoritative.
- **In review** — ready for stakeholder review.
- **Approved** — accepted as part of the governing specification.
- **Superseded** — retained for history and linked to its replacement.

Documents should include an owner, version, last-updated date, and links to related requirements or decisions where applicable.
