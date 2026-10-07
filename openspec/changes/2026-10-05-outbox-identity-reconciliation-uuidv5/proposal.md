# Proposal: Deterministic UUID v5 for Author Identity Reconciliation

## Intent

Eliminate fragile client-side outbox payload rewrites and distributed foreign-key reconciliation conflicts (Issue #70, Phase 1) by adopting deterministic RFC4122 UUID v5 identifiers for `Author` entities based on normalized names across `@myself/shared`, `apps/mobile`, and `apps/api`.

## Scope

### In Scope

- **Shared Domain Primitives (`@myself/shared`)**:
  - Deterministic name normalization (`normalizeAuthorName(name: string): string`).
  - RFC4122 UUID v5 generation using a designated DNS/App namespace (`generateAuthorId(name: string): EntityId`).
  - Unit tests verifying RFC4122 compliance, idempotency, and normalization rules.
- **Backend Service (`apps/api`)**:
  - Update `AuthorService.create` to derive the author ID deterministically from `normalizeAuthorName(name)` when not explicitly provided or when resolving existing records.
  - Unit/integration tests asserting deterministic author ID matching.
- **Mobile Persistence & Sync Engine (`apps/mobile`)**:
  - Update `addAuthor` in `database.ts` to assign deterministic UUID v5 to authors before inserting into `authors` and `sync_outbox`.
  - Verify that `SyncEngine` encounters zero foreign-key drift between local and remote author IDs.

### Out of Scope

- Mutation coalescing / squashing (`CREATE + DELETE => null`) in `SqliteReadingRepository` (deferred to Phase 2 of Issue #70).
- Optimistic concurrency control (`If-Match` / `version` headers) on `PUT /v1/readings/:id` (deferred to Phase 3 of Issue #70).

## Capabilities

### Modified Capabilities

- `identity-reconciliation`: Deterministic identity derivation for natural key entities across client and server.

## Approach

1. **Deterministic Generator in Shared**: Implement a pure, platform-independent RFC4122 UUID v5 generator in `@myself/shared/src/primitives/author-id.ts` using SHA-1 hashing over a dedicated application namespace.
2. **TDD First (Red)**: Add failing unit tests asserting that identical names with varied casing and whitespace yield identical UUID v5 IDs in `@myself/shared`, `apps/api`, and `apps/mobile`.
3. **Backend & Mobile Adoption (Green)**: Replace random UUID generation for authors with `generateAuthorId(name)`.
4. **Verification**: Run `make check-tests`, `make check-types`, `make check-lint`, `make check-format`.
