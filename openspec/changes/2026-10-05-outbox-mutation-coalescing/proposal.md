# Proposal: Outbox Mutation Coalescing (Pre-Sync Squashing)

## Intent

Implement mutation coalescing (squashing) in the transactional outbox (`sync_outbox`) within `SqliteReadingRepository` to prevent redundant network traffic, tombstone race conditions, and orphaned remote mutations (Issue #70, Phase 2).

## Scope

### In Scope

- **Outbox Coalescing in `SqliteReadingRepository` (`apps/mobile`)**:
  - `CREATE + DELETE => null`: Cancel out pending creation when deleted offline before synchronization. Purge outbox records locally with 0 network calls.
  - `CREATE + UPDATE => CREATE`: Squash subsequent updates into the original pending create with latest merged payload.
  - `UPDATE + UPDATE => UPDATE`: Squash subsequent updates into a single update record with latest payload.
  - `UPDATE + DELETE => DELETE`: Replace pending updates with a single delete mutation.
- **TDD Integration Test Suite**:
  - `apps/mobile/src/features/readings/infrastructure/__tests__/sqlite-reading.repository.test.ts` testing all 4 coalescing transitions against SQLite outbox.

### Out of Scope

- Optimistic concurrency control / `If-Match` headers on backend API (Phase 3 of Issue #70).

## Capabilities

### Modified Capabilities

- `offline-first-sync-engine`: Add transactional outbox mutation squashing and tombstone coalescing prior to remote synchronization.

## Approach

1. **TDD First (Red)**: Create `sqlite-reading.repository.test.ts` verifying all 4 mutation coalescing scenarios. Observe failures against the existing un-coalesced repository.
2. **Implementation (Green)**: Update `save()` and `delete()` in `SqliteReadingRepository` to inspect pending mutations for `entity_id` inside the write transaction and apply squashing rules.
3. **Verification**: Run `make check-tests`, `make check-types`, `make check-lint`, `make check-format`, `make check`.
