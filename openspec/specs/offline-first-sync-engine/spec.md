# Capability: Offline-First Sync Engine

## 1. Overview

The Offline-First Sync Engine provides transactional outbox queuing, local SQLite persistence as the immediate source of UI state, and event-driven bidirectional synchronization with the remote backend API.

## 2. Requirements & Scenarios

### REQ-1: Transactional Outbox Local Persistence

- `SqliteReadingRepository` SHALL read directly from local SQLite for all query operations.
- For all write operations (`save`, `delete`, `recordLog`), the repository SHALL execute an atomic local SQLite transaction that updates the local entity table AND inserts a record into `sync_outbox`.
- Outbox records SHALL store `{ id, entity, entity_id, operation, payload, status: 'pending', created_at }`.

#### Scenario: Offline mutation execution

- **Given** the device has no internet connection
- **When** the user marks a reading as read via `recordLog(readingId)`
- **Then** the local SQLite table updates immediately (< 10ms) and a pending outbox entry is queued without throwing network errors.

### REQ-2: Push Sync on Connectivity and Lifecycle

- The Sync Engine SHALL monitor network connectivity using `@react-native-community/netinfo` and TanStack's `onlineManager`.
- When network is available, the engine SHALL drain pending outbox records in FIFO order, dispatching requests via `@myself/shared/client`.
- Upon successful HTTP 2xx response, the outbox record SHALL be marked `synced` and the local entity status updated.
- If network requests fail, the outbox record SHALL remain `pending` with incremented retry attempts.

#### Scenario: Draining pending mutations upon reconnection

- **Given** 2 pending mutation records in `sync_outbox`
- **When** network connection transitions from offline to online
- **Then** the Sync Engine SHALL dispatch the mutations in sequence to the remote API and remove them from the pending queue.

### REQ-3: Pull Sync and Reactive Cache Invalidation

- The Sync Engine SHALL trigger a remote fetch (`GET /v1/readings?since={last_synced_at}`) on app mount, network reconnection, and foreground focus (if stale > 5 minutes).
- Changes received from remote SHALL be upserted into local SQLite.
- Upon completing remote reconciliation, the engine SHALL invoke `queryClient.invalidateQueries({ queryKey: ['readings'] })`.

#### Scenario: Server changes reflect reactively in UI

- **Given** new readings were added on the backend
- **When** the Sync Engine finishes the pull reconciliation
- **Then** TanStack Query invalidates the cache and the UI renders the newly synced readings automatically.
