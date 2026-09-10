# Tasks: Frontend Hexagonal Architecture & Offline-First Sync for Meditation API

## Review Workload Forecast

| Field                   | Value           |
| ----------------------- | --------------- |
| Estimated changed lines | 600 - 800 lines |
| 400-line budget risk    | Medium          |
| Chained PRs recommended | No              |
| Suggested split         | single-pr       |
| Delivery strategy       | single-pr       |
| Chain strategy          | size-exception  |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal                                               | Likely PR | Focused test command                                        | Runtime harness                | Rollback boundary                                                                       |
| ---- | -------------------------------------------------- | --------- | ----------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| 1    | Shared Kernel Domain Extraction                    | PR 1      | `bun test --cwd packages/shared && bun test --cwd apps/api` | N/A (Unit tests)               | `packages/shared/src/domain/`, `apps/api/src/domain/`                                   |
| 2    | Mobile Hexagonal Foundation & TanStack Query Setup | PR 1      | `bun test --cwd apps/mobile`                                | N/A (Unit tests)               | `apps/mobile/src/core/query/`, `package.json`                                           |
| 3    | SQLite Outbox Storage & API Adapter                | PR 1      | `bun test --cwd apps/mobile`                                | N/A (Unit tests)               | `apps/mobile/src/core/sync/`, `apps/mobile/src/features/readings/infrastructure/`       |
| 4    | Hooks & UI Integration in Meditation Screen        | PR 1      | `bun run check-types`                                       | Mobile simulator / web preview | `apps/mobile/src/features/readings/hooks/`, `apps/mobile/src/app/(tabs)/meditation.tsx` |

---

## Phase 1: Shared Kernel Domain Extraction

- [x] 1.1 Create `packages/shared/src/domain/entities/author.entity.ts`, `reading.entity.ts`, `user.entity.ts`.
- [x] 1.2 Create `packages/shared/src/domain/index.ts` and re-export domain entities in `packages/shared/src/index.ts`.
- [x] 1.3 Add unit tests in `packages/shared/src/domain/__tests__/entities.test.ts` verifying domain methods and getters.
- [x] 1.4 Update `apps/api/src/domain/models/*` to re-export or consume from `@myself/shared`.
- [x] 1.5 Run API regression tests (`bun test --cwd apps/api`) to verify zero regressions.

## Phase 2: Mobile Infrastructure & TanStack Query Setup

- [x] 2.1 Add `@tanstack/react-query` and `@react-native-community/netinfo` to `apps/mobile/package.json` using bun.
- [x] 2.2 Create `apps/mobile/src/core/query/query-client.ts` configuring QueryClient with `onlineManager` listeners.
- [x] 2.3 Update `apps/mobile/src/app/_layout.tsx` to wrap the app tree in `QueryClientProvider`.

## Phase 3: Outbox Engine & Hexagonal Adapters

- [x] 3.1 Define `IReadingRepository` port contract in `apps/mobile/src/features/readings/domain/reading.repository.ts`.
- [x] 3.2 Define `sync_outbox` schema and create migration in `apps/mobile/src/core/db/`.
- [x] 3.3 Implement `SqliteReadingRepository` in `apps/mobile/src/features/readings/infrastructure/sqlite-reading.repository.ts` executing atomic outbox transactions.
- [x] 3.4 Implement `HttpReadingApiAdapter` in `apps/mobile/src/features/readings/infrastructure/http-reading-api.adapter.ts` using `@myself/shared/client`.
- [x] 3.5 Implement `SyncEngine` in `apps/mobile/src/core/sync/sync-engine.ts` with push outbox drainer and pull reconciler (`GET /v1/readings?since=`).

## Phase 4: Application Hooks & UI Decoupling

- [x] 4.1 Implement `useReadings` hook in `apps/mobile/src/features/readings/hooks/use-readings.ts` wrapping the repository port with TanStack Query.
- [x] 4.2 Refactor `apps/mobile/src/app/(tabs)/meditation.tsx` to consume the new `useReadings` hook, removing legacy direct SQLite database calls.
- [x] 4.3 Add unit tests for `useReadings` and `SyncEngine` using in-memory mock repositories.

## Phase 5: Verification & Typecheck

- [x] 5.1 Run full monorepo typecheck: `bun run typecheck`.
- [x] 5.2 Run full unit test suite: `bun run test`.
- [x] 5.3 Run linter and formatting checks: `bun run check-lint` and `bun run check-format`.
