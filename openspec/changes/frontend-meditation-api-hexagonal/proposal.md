# Proposal: Frontend Hexagonal Architecture & Offline-First Sync for Meditation API

## Intent

The current mobile application (`apps/mobile`) accesses local SQLite directly within custom hooks, lacking a clean architectural separation and an integration layer with the backend API (`apps/api`). Furthermore, business domain entities (`Reading`, `Author`, `User`) are currently trapped inside `apps/api/src/domain/models/`, forcing duplication if the frontend requires rich domain models and invariants.

As the product expands to support multiple CRUD / ABM modules (Authors, Readings, Reflections) and requires the remote API to serve as the Single Source of Truth (SSOT), we need an industrial-grade architecture that guarantees:

1. **Shared Kernel Domain (`packages/shared/src/domain`)**: Extract domain models, invariants, and validation rules into `@myself/shared` so both backend and mobile frontend share the exact same entity classes and validation schemas.
2. **Instant offline usability**: Zero UI latency and offline read/write capabilities via local SQLite.
3. **Transactional Outbox Sync**: Asynchronous, event-driven bidirectional synchronization with the Hono REST API.
4. **Hexagonal Architecture (Ports & Adapters)**: Full decoupling between the UI, Application orchestration hooks (powered by TanStack Query), Domain contracts, and Infrastructure adapters.

## Scope

### In Scope

- **Shared Kernel Domain Extraction**: Move `Reading`, `Author`, and `User` entity classes from `apps/api` into `packages/shared/src/domain/entities/` and re-export them from `@myself/shared`.
- **Domain Ports & Contracts in Mobile**: Define strict TypeScript interfaces for reading repositories (`IReadingRepository`) and sync status contracts.
- **Transactional Outbox Persistence**: Introduce the `sync_outbox` table and SQLite adapter (`SqliteReadingRepository`) in `apps/mobile` to handle atomic local writes and pending mutation queuing.
- **Typed Remote API Adapter**: Implement `HttpReadingApiAdapter` leveraging `@myself/shared/client` (`hc<AppType>`).
- **Application Hooks & TanStack Query**: Introduce TanStack Query provider and refactor `useReadings` to orchestrate queries and mutations against the domain port.
- **Sync Engine (Push / Pull Lifecycle)**: Implement background reconciliation triggered by network reconnect, app mount, focus, and explicit user pull-to-refresh.
- **UI Decoupling**: Update `meditation.tsx` to consume the refactored domain hook without direct SQLite or networking imports.
- **Backend Refactor**: Update `apps/api` imports to consume the newly shared entities from `@myself/shared` without any breaking changes to API behavior.

### Out of Scope

- Full CRDT / multi-user collaborative editing (LWW - Last Write Wins with client UUIDs is sufficient).
- Background OS tasks / headless workers when the application process is completely terminated.
- Modification of backend database engine (Turso / libSQL remains unchanged).

## Capabilities

### New Capabilities

- `shared-kernel-domain`: Centralizes domain entities (`Reading`, `Author`, `User`), business methods, and invariants in `packages/shared` for monorepo-wide reuse.
- `frontend-hexagonal-architecture`: Establishes the port/adapter layout, TanStack Query application orchestration, and feature module boundaries for `apps/mobile`.
- `offline-first-sync-engine`: Implements the transactional outbox pattern in SQLite, network lifecycle listeners, and bidirectional sync (Push/Pull) with the remote API.

### Modified Capabilities

- `meditation-session`: Decouple reading catalog retrieval from legacy direct SQLite calls, binding it to the new `IReadingRepository` port.

## Approach

1. **Shared Kernel Extraction**:
   - Create `packages/shared/src/domain/entities/` with `Reading`, `Author`, and `User`.
   - Update `apps/api` to import entities from `@myself/shared`.
2. **Layering & Module Structure in Mobile**:
   - Organize code under `apps/mobile/src/features/readings/` (`domain/`, `infrastructure/`, `hooks/`, `components/`) and `apps/mobile/src/core/` (`api/`, `db/`, `query/`, `sync/`).
3. **Local-First Outbox Pattern**:
   - Every write writes directly to SQLite and records an outbox entry in the same transaction.
   - When network is available, the sync engine drains the outbox to `POST/PUT/DELETE /v1/readings`.
4. **Reactive Invalidation**:
   - The sync engine invalidates TanStack Query keys (`['readings']`) upon receiving updates, triggering seamless UI refreshes.

## Affected Areas

| Area                                                | Impact                | Description                                                              |
| --------------------------------------------------- | --------------------- | ------------------------------------------------------------------------ |
| `packages/shared/src/domain/`                       | New                   | Shared domain entities (`Reading`, `Author`, `User`) and business logic. |
| `packages/shared/src/index.ts`                      | Modified              | Export shared domain entities.                                           |
| `apps/api/src/domain/models/`                       | Removed / Re-exported | Replaced with imports from `@myself/shared`.                             |
| `apps/mobile/package.json`                          | Modified              | Add `@tanstack/react-query` and `@react-native-community/netinfo`.       |
| `apps/mobile/src/core/query/`                       | New                   | Global `QueryClientProvider` configuration.                              |
| `apps/mobile/src/core/sync/`                        | New                   | Sync Engine implementation (Outbox processor & pull reconciler).         |
| `apps/mobile/src/features/readings/domain/`         | New                   | Domain models and `IReadingRepository` port interface.                   |
| `apps/mobile/src/features/readings/infrastructure/` | New                   | `SqliteReadingRepository` (with outbox) and `HttpReadingApiAdapter`.     |
| `apps/mobile/src/features/readings/hooks/`          | New                   | Refactored `useReadings` leveraging TanStack Query.                      |
| `apps/mobile/src/app/(tabs)/meditation.tsx`         | Modified              | Consume clean `useReadings` hook.                                        |
| `apps/mobile/src/app/_layout.tsx`                   | Modified              | Wrap app with `QueryClientProvider`.                                     |

## Risks

| Risk                                           | Likelihood | Mitigation                                                                                              |
| ---------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| Regressions in `apps/api` when moving entities | Low        | Run full suite `bun test` in `apps/api` to verify zero functional regression.                           |
| Outbox sync failure loops on schema mismatch   | Low        | Enforce Zod schemas from `@myself/shared` on both ends; cap max retry attempts with dead-letter status. |
| Stale reads during offline mode                | Med        | Display subtle UI indicators when viewing offline data or while sync is in progress.                    |

## Rollback Plan

All changes preserve backward compatibility:

1. `apps/api` entity moves can be rolled back without database schema changes.
2. The repository port can fall back directly to the legacy SQLite implementation (`getAllReadings`).

## Dependencies

- `@tanstack/react-query`: For server state management and reactive cache invalidation.
- `@react-native-community/netinfo`: For cross-platform network state detection.
- `@myself/shared`: Monorepo shared kernel.

## Success Criteria

- [ ] Domain entities (`Reading`, `Author`, `User`) are imported from `@myself/shared` across both `apps/api` and `apps/mobile`.
- [ ] All reading queries in `meditation.tsx` render instantly (< 10ms) from local SQLite even in airplane mode.
- [ ] Mutations made offline persist to local SQLite and sync to remote API when network reconnects.
- [ ] No direct `expo-sqlite` or HTTP fetch calls exist in UI screens or presentation components.
- [ ] Monorepo passes all tests (`make check-tests`) and typechecks (`make check-types`).
