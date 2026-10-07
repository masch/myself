# Design: Core Optimistic Concurrency Control (OCC) with Entity Versioning

## Context & Problem Statement

When multiple mobile clients or browser sessions read a record and independently edit it offline, a naive `PUT /v1/readings/:id` performs a blind Last-Write-Wins (LWW) overwrite. The last client to reconnect silently destroys changes made by the preceding client.

HTTP transport headers (`ETag` / `If-Match`) are insufficient for offline-first clients because SQLite stores serialized payloads and domain entities, not transient HTTP response headers.

## Architecture Decision Record (ADR)

### Decision: Monotonic `version: number` in Domain Model & Payload

1. **Primitive & Guard in `@myself/shared`**:
   - `versionSchema`: `z.number().int().min(1).default(1)`
   - `assertOptimisticLock(currentVersion: number, expectedVersion?: number): void`:
     - If `expectedVersion === undefined`: Allowed (backwards compatibility / initial sync).
     - If `expectedVersion !== currentVersion`: Throws `ConflictError` with detailed expected/received diagnostic message.
2. **Domain Model (`Reading`)**:
   - `version: number` in `ReadingProps` (defaults to 1).
   - `update(input)` computes `newVersion = existing.version + 1`.
3. **API Contract & Persistence**:
   - `UpdateReadingInput` includes `version?: number`.
   - `ReadingDto` returns `version: number`.
   - Handlers map `ConflictError` to `409 Conflict`.
