# Design: Outbox Mutation Coalescing (Pre-Sync Squashing)

## Context & Problem Statement

Offline-first clients queue mutations into `sync_outbox`. When network is disconnected for extended periods, a user may perform multiple successive edits or deletions on the same entity. Without coalescing:

1. `CREATE` followed by `DELETE` sends a `POST` and a subsequent `DELETE` over the wire, wasting battery and network and risking transient failure on an already-deleted entity.
2. `CREATE` followed by multiple `UPDATE`s pushes obsolete intermediary states to the server.
3. Concurrent outbox drains can suffer from tombstone racing if mutations are retried out of order.

## Architecture Decision Record (ADR)

### Decision: State Machine for In-Flight Outbox Records

When enqueuing a mutation for `(entity, entity_id)`:

1. Query pending records:
   `SELECT id, operation FROM sync_outbox WHERE entity = ? AND entity_id = ? AND status = 'pending' ORDER BY rowid ASC`
2. **Squashing Rules**:
   - If an existing pending record has `operation = 'CREATE'`:
     - New operation `UPDATE`: Update the payload and timestamp of the existing `CREATE` record (`UPDATE sync_outbox SET payload = ?, created_at = ... WHERE id = ?`). Do not insert a new row.
     - New operation `DELETE`: The entity was created offline and deleted offline. Remove the pending `CREATE` record completely (`DELETE FROM sync_outbox WHERE id = ?`). Do not insert a `DELETE` row.
   - If an existing pending record has `operation = 'UPDATE'`:
     - New operation `UPDATE`: Update the payload of the existing `UPDATE` record.
     - New operation `DELETE`: Update the operation to `DELETE`, clear/minimize payload, or remove prior `UPDATE`s and insert a single `DELETE`.
   - If no pending record exists:
     - Normal `INSERT INTO sync_outbox`.
3. All operations run inside `db.withTransactionAsync` with SQLite table updates to guarantee atomic consistency.
