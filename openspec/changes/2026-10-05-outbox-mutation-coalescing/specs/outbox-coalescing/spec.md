# Spec: Outbox Mutation Coalescing

## Capability: `offline-first-sync-engine`

### Requirement: Transactional Outbox Pre-Sync Mutation Squashing

The repository MUST coalesce pending outbox mutations on the same entity to produce the minimal canonical set of operations before network transmission.

#### Scenario: CREATE + DELETE cancellation

- **Given** a new entity created offline with a pending `CREATE` mutation in `sync_outbox`
- **When** the entity is deleted offline before synchronization
- **Then** all pending outbox records for that entity are purged
- **And** zero mutations remain pending in `sync_outbox`.

#### Scenario: CREATE + UPDATE payload squashing

- **Given** a new entity created offline with an initial pending `CREATE` mutation
- **When** the entity is updated offline one or more times
- **Then** the outbox maintains exactly one record with `operation = 'CREATE'`
- **And** its payload reflects the latest updated state.

#### Scenario: UPDATE + UPDATE payload squashing

- **Given** an existing synced entity updated offline
- **When** the entity is updated offline again
- **Then** the outbox maintains exactly one `UPDATE` record with the latest state.

#### Scenario: UPDATE + DELETE compaction

- **Given** an existing synced entity with one or more pending `UPDATE` mutations
- **When** the entity is deleted offline
- **Then** the prior `UPDATE` records are discarded
- **And** exactly one `DELETE` record is enqueued.
