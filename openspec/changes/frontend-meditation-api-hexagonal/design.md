# Design: Frontend Hexagonal Architecture & Offline-First Sync for Meditation API

## Technical Approach

This design establishes a clean separation between the user interface and infrastructure in `apps/mobile`, introduces the Shared Kernel domain in `@myself/shared`, and implements a local-first offline synchronization engine using the Transactional Outbox Pattern and TanStack Query.

---

## Architecture Decisions

### Decision 1: Shared Kernel Domain in `@myself/shared`

- **Choice**: Extract `Reading`, `Author`, and `User` domain entity classes from `apps/api/src/domain/models/` into `packages/shared/src/domain/entities/`.
- **Alternatives considered**:
  - Keep entities in `apps/api` and define duplicate interfaces in `apps/mobile`. (Rejected: Violates DRY, creates drift in business logic).
  - Define only plain TypeScript interfaces in `shared` without entity classes. (Rejected: Discards rich domain methods like `isCompletedToday()` and encapsulation of domain invariants).
- **Rationale**: Clean Architecture dictates that enterprise business rules belong to the core domain, not to a specific delivery mechanism (API or Mobile UI). Both apps share identical domain classes and Zod validation contracts.

### Decision 2: Local-First Outbox Pattern for Offline Synchronization

- **Choice**: Local SQLite (`expo-sqlite`) acts as the immediate read/write store. All mutations write to SQLite and append an event to `sync_outbox` in an atomic transaction. A background `SyncEngine` drains the outbox to the remote Hono API when online.
- **Alternatives considered**:
  - React Query cache persistence (`@tanstack/query-persist-client-core`). (Rejected: Cannot run relational queries, SQL joins, or transaction rollbacks offline).
  - Third-party sync engine (WatermelonDB / PowerSync). (Rejected: Requires dedicated sync infrastructure or Postgres logical replication, violating our lightweight Turso/Cloudflare architecture).
- **Rationale**: Pure SQLite is lightweight, fully supported by Expo, requires zero external server daemons, and delivers sub-5ms UI responsiveness offline.

### Decision 3: Application Layer Orchestration with TanStack Query

- **Choice**: Wrap repository port calls in custom hooks using `@tanstack/react-query` (`useQuery` for reads, `useMutation` for writes).
- **Alternatives considered**: Manual `useState` + `useEffect` in hooks. (Rejected: Requires custom caching, manual deduplication, manual reconnection handlers, and error state boilerplate).
- **Rationale**: Standardizes all present and future ABMs with a unified hook signature (`{ data, isLoading, mutate }`) and provides automatic reactive UI updates upon sync completion.

---

## Data Flow

### 1. Read Flow (Instant Local State)

```
UI Screen (meditation.tsx)
       │
       ▼
useReadings() [TanStack useQuery]
       │
       ▼
IReadingRepository.getAll()
       │
       ▼
SqliteReadingRepository (expo-sqlite) ───[ < 5ms ]───→ Returns Reading[]
```

### 2. Write Flow (Offline-First Outbox)

```
UI Event (Create / Record Log)
       │
       ▼
useCreateReading() [TanStack useMutation]
       │
       ▼
SqliteReadingRepository.save(reading)
       │
       ▼ ATOMIC SQLITE TRANSACTION
       ├── INSERT INTO readings (...)
       └── INSERT INTO sync_outbox (entity, operation, payload, status: 'pending')
       │
       ▼ UI updates immediately
```

### 3. Background Sync (Push & Pull Engine)

```
NetInfo / App Focus / Mount Trigger
       │
       ▼
SyncEngine.syncAll()
       │
       ├── [PUSH]: Reads pending sync_outbox records
       │     └── Dispatches to POST/PUT/DELETE /v1/readings via @myself/shared/client
       │     └── On 200 OK: Marks outbox record 'synced' and purges
       │
       └── [PULL]: GET /v1/readings?since={last_synced_at}
             └── Upserts changes into local SQLite
             └── Updates last_synced_at
             └── Calls queryClient.invalidateQueries(['readings'])
```

---

## File Changes

| File                                                                            | Action          | Description                                                        |
| ------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| `packages/shared/src/domain/entities/author.entity.ts`                          | Create          | Shared Author domain entity class.                                 |
| `packages/shared/src/domain/entities/reading.entity.ts`                         | Create          | Shared Reading domain entity class.                                |
| `packages/shared/src/domain/entities/user.entity.ts`                            | Create          | Shared User domain entity class.                                   |
| `packages/shared/src/domain/index.ts`                                           | Create          | Domain barrel exports.                                             |
| `packages/shared/src/index.ts`                                                  | Modify          | Re-export shared domain entities.                                  |
| `apps/api/src/domain/models/*`                                                  | Modify          | Re-export or import from `@myself/shared`.                         |
| `apps/mobile/package.json`                                                      | Modify          | Add `@tanstack/react-query` and `@react-native-community/netinfo`. |
| `apps/mobile/src/core/query/query-client.ts`                                    | Create          | Global QueryClient configuration with onlineManager.               |
| `apps/mobile/src/core/db/schema.ts`                                             | Create / Modify | Add `sync_outbox` and local entity schemas.                        |
| `apps/mobile/src/core/sync/sync-engine.ts`                                      | Create          | Background outbox processor and pull reconciler.                   |
| `apps/mobile/src/features/readings/domain/reading.repository.ts`                | Create          | `IReadingRepository` port contract.                                |
| `apps/mobile/src/features/readings/infrastructure/sqlite-reading.repository.ts` | Create          | SQLite adapter implementing outbox transactions.                   |
| `apps/mobile/src/features/readings/infrastructure/http-reading-api.adapter.ts`  | Create          | Remote API adapter using `@myself/shared/client`.                  |
| `apps/mobile/src/features/readings/hooks/use-readings.ts`                       | Create          | TanStack Query hook exposing readings to UI.                       |
| `apps/mobile/src/app/_layout.tsx`                                               | Modify          | Wrap application root with `QueryClientProvider`.                  |
| `apps/mobile/src/app/(tabs)/meditation.tsx`                                     | Modify          | Consume the new `useReadings` hook.                                |

---

## Interfaces / Contracts

### 1. `IReadingRepository` Port (`apps/mobile/src/features/readings/domain/reading.repository.ts`)

```typescript
import { Reading, type SupportedLocale } from "@myself/shared";

export interface IReadingRepository {
  getAll(locale: SupportedLocale): Promise<Reading[]>;
  getById(id: string): Promise<Reading | null>;
  save(reading: Reading): Promise<void>;
  delete(id: string): Promise<void>;
  recordLog(readingId: string): Promise<string>;
  getLogs(readingId: string): Promise<{ id: string; readAt: string }[]>;
}
```

### 2. `SyncOutboxRecord` Contract (`apps/mobile/src/core/sync/types.ts`)

```typescript
export interface SyncOutboxRecord {
  id: string;
  entity: string;
  entityId: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "synced" | "failed";
  attempts: number;
  lastError?: string;
  createdAt: string;
}
```

---

## Verification Plan

### Automated Tests

1. **Unit Tests (Domain & Shared Kernel)**:
   - Run `bun test` in `packages/shared` to verify entity methods, getters, and invariants.
2. **API Regression Tests**:
   - Run `bun run test` in `apps/api` to verify backend compatibility after referencing `@myself/shared`.
3. **Repository Adapter Tests**:
   - Test `SqliteReadingRepository` with mock database to ensure atomic writes to both reading table and `sync_outbox`.
4. **Sync Engine Tests**:
   - Test `SyncEngine` outbox draining with mock API adapter (success, network failure, and retry logic).

### Manual Verification

1. Put device/simulator in Airplane mode.
2. Verify readings load instantly in `meditation.tsx`.
3. Log a meditation reading completion while offline; verify outbox record is queued.
4. Disable Airplane mode; verify sync engine drains outbox and syncs to backend API.
