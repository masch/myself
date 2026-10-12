# Spec: Core Optimistic Concurrency Control

## Capability: `shared-kernel-domain`

### Requirement: Optimistic Lock Assertion

The domain kernel MUST provide a reusable assertion guard that rejects version mismatches with a domain `ConflictError`.

#### Scenario: Version match or omitted version

- **Given** an entity at version 2
- **When** asserting lock with expectedVersion 2 or undefined
- **Then** the assertion succeeds without throwing.

#### Scenario: Stale version mismatch

- **Given** an entity at version 2
- **When** asserting lock with expectedVersion 1
- **Then** the assertion throws a `ConflictError` with message indicating expected and received versions.

## Capability: `offline-first-sync-engine`

### Requirement: Stale Update Rejection on API

The API MUST reject updates specifying an outdated entity version and return HTTP 409 Conflict.

#### Scenario: Concurrent update collision

- **Given** a reading created with version 1
- **And** client A successfully updates the reading to version 2
- **When** client B submits an update with version 1
- **Then** the API responds with HTTP 409 Conflict
- **And** client A's modifications remain intact in the database.
