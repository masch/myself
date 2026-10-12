# Design: Deterministic UUID v5 for Author Identity Reconciliation

## Context & Problem Statement

In offline-first synchronization, multiple mobile clients can independently create identical domain authors (e.g., "Seneca" or "Marco Aurelio"). With random UUID v4:

- Client A assigns `uuid-A` offline and references it in `reading.authorId = uuid-A`.
- Client B assigns `uuid-B` offline and references it in `reading.authorId = uuid-B`.
- The backend reconciles by natural key (`name`) and persists only one ID (`uuid-A`).
- When Client B drains its outbox, the server returns `uuid-A`. Client B is forced to parse all pending outbox payloads, rewrite serialized JSON strings, and update local SQLite foreign keys.

This is fragile, vulnerable to concurrent race conditions, and pollutes the transactional outbox with in-flight mutations.

## Architecture Decision Record (ADR)

### Decision: RFC4122 UUID v5 via Normalized Name

Instead of random identifiers and reactive client-side patching:

1. `Author` identity is derived deterministically from the author's natural key: `name`.
2. Name normalization rules:
   - Trim whitespace.
   - Convert to lowercase.
   - Collapse contiguous whitespace into single spaces.
3. Compute RFC4122 UUID v5:
   - Namespace UUID: `6ba7b810-9dad-11d1-80b4-00c04fd430c8` (DNS) or custom fixed UUID `d4e5f6a7-b8c9-5011-8234-56789abcdef0`.
   - Hash algorithm: SHA-1 over `namespaceBytes + normalizedNameBytes`.
   - Set version bits (0x50) and variant bits (0x80).
4. Both Mobile (offline SQLite) and Backend (API) compute the exact same ID before persisting.
5. Key reconciliation is completely eliminated by design.

## Technical Implementation Details

### 1. `@myself/shared`

- `packages/shared/src/primitives/author-id.ts`:
  - `normalizeAuthorName(name: string): string`
  - `generateAuthorId(name: string): EntityId`
  - Pure TypeScript implementation using Web Crypto (`crypto.subtle.digest("SHA-1", ...)`) or pure SHA-1 helper to ensure zero external dependency bloat and universal compatibility with Node, Bun, and React Native.

### 2. `apps/api`

- `apps/api/src/services/author.service.ts`:
  - When `input.id` is not provided, use `generateAuthorId(input.name)` instead of `generateEntityId()`.

### 3. `apps/mobile`

- `apps/mobile/src/infrastructure/persistence/database.ts`:
  - In `addAuthor(db, name, bio)`, compute `id = generateAuthorId(name)`.
  - Use `id` for inserting into `authors` and `sync_outbox`.
