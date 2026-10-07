# Proposal: Core Optimistic Concurrency Control (OCC) with Entity Versioning

## Intent

Implement core Optimistic Concurrency Control (OCC) using monotonic version tags (`version: number`) across the Shared Kernel (`@myself/shared`), Backend API (`apps/api`), and Mobile outbox payload to prevent blind Last-Write-Wins (LWW) multi-device data overwrites (Issue #70, Phase 3).

## Scope

### In Scope

- **Shared Kernel Primitives (`@myself/shared`)**:
  - `versionSchema` (`z.number().int().positive().default(1)`).
  - Domain guard: `assertOptimisticLock(currentVersion: number, expectedVersion?: number): void`.
  - Add optional `version` field to `Reading` domain entity, `ReadingDto`, `createReadingSchema`, and `updateReadingSchema`.
- **Backend Service & Route (`apps/api`)**:
  - Update `ReadingService.update` to check `assertOptimisticLock(existing.version, input.version)`.
  - Reject stale updates with `ConflictError` (HTTP 409 Conflict).
  - Monotonically increment `version` on successful update (`existing.version + 1`).
- **TDD Integration Test Suite**:
  - Unit tests in `@myself/shared` for `assertOptimisticLock`.
  - Service and route integration tests in `apps/api` asserting `409 Conflict` on concurrent version mismatch and version increments.

### Out of Scope

- Migration of historical SQLite tables (version defaults to 1 for backward compatibility).
- Three-way merge UI diff screens (returns standard 409 Conflict for client-side resolution).

## Capabilities

### Modified Capabilities

- `shared-kernel-domain`: Add generic optimistic concurrency control types and assertion guard.
- `offline-first-sync-engine`: Guard entity mutations against concurrent multi-device overwrites with monotonic versions.

## Approach

1. **TDD Core Guard**: Implement failing unit tests for `assertOptimisticLock` in `@myself/shared`, then implement the guard and schema.
2. **TDD Backend Concurrency**: Write failing tests in `apps/api` for concurrent update conflicts (`ConflictError`), then implement optimistic locking in `ReadingService.update`.
3. **Verification**: Run `make check-tests`, `make check-types`, `make check-lint`, `make check-format`, `make check`.
