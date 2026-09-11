import { type SQLiteDatabase } from "expo-sqlite";
import { queryClient } from "../query/query-client";
import { HttpReadingApiAdapter } from "../../features/readings/infrastructure/http-reading-api.adapter";
import type { SyncOutboxRecord } from "./types";
import { type CreateReadingInput } from "@myself/shared";

const MAX_SYNC_ATTEMPTS = 5;

export class SyncEngine {
  private isSyncing = false;

  constructor(
    private readonly db: SQLiteDatabase,
    private readonly apiAdapter: HttpReadingApiAdapter = new HttpReadingApiAdapter(),
  ) {}

  /**
   * Dispatches push and pull synchronization.
   */
  async syncAll(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      await this.pushPendingOutbox();
      await this.pullRemoteUpdates();
      await queryClient.invalidateQueries({ queryKey: ["readings"] });
    } catch (error) {
      console.warn("[SyncEngine] Sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async recordFailure(
    recordId: string,
    attempts: number,
    errorMsg: string,
  ): Promise<void> {
    const nextAttempts = attempts + 1;
    const nextStatus = nextAttempts >= MAX_SYNC_ATTEMPTS ? "failed" : "pending";
    await this.db.runAsync(
      "UPDATE sync_outbox SET attempts = ?, status = ?, last_error = ? WHERE id = ?",
      [nextAttempts, nextStatus, errorMsg, recordId],
    );
  }

  /**
   * Drains pending records from sync_outbox to remote API.
   */
  async pushPendingOutbox(): Promise<void> {
    const pending = await this.db.getAllAsync<SyncOutboxRecord>(
      // created_at is inserted with subsecond precision (see SqliteReadingRepository),
      // so ordering by created_at ASC preserves insertion order reliably.
      "SELECT id, entity, entity_id AS entityId, operation, payload, status, attempts, last_error AS lastError, created_at AS createdAt FROM sync_outbox WHERE status = 'pending' ORDER BY created_at ASC, id ASC",
    );

    for (const record of pending) {
      if (record.entity === "author" && record.operation === "CREATE") {
        try {
          const payload =
            typeof record.payload === "string"
              ? JSON.parse(record.payload)
              : record.payload;

          const remoteAuthorId = await this.apiAdapter.postAuthor(payload);
          if (remoteAuthorId) {
            // Update local author and readings referencing the local id if remote returned a new id
            if (remoteAuthorId !== record.entityId) {
              await this.db.runAsync("UPDATE authors SET id = ? WHERE id = ?", [
                remoteAuthorId,
                record.entityId,
              ]);
              await this.db.runAsync(
                "UPDATE meditation_readings SET author_id = ? WHERE author_id = ?",
                [remoteAuthorId, record.entityId],
              );
            }
            await this.db.runAsync(
              "UPDATE sync_outbox SET status = 'synced' WHERE id = ?",
              [record.id],
            );
          } else {
            await this.recordFailure(
              record.id,
              record.attempts,
              "Server returned null author ID",
            );
          }
        } catch (err) {
          await this.recordFailure(record.id, record.attempts, String(err));
        }
      } else if (record.entity === "reading" && record.operation === "CREATE") {
        try {
          const payload =
            typeof record.payload === "string"
              ? JSON.parse(record.payload)
              : record.payload;

          const success = await this.apiAdapter.postReading(
            payload as CreateReadingInput,
          );
          if (success) {
            await this.db.runAsync(
              "UPDATE sync_outbox SET status = 'synced' WHERE id = ?",
              [record.id],
            );
          } else {
            await this.recordFailure(
              record.id,
              record.attempts,
              "Failed to post reading to API",
            );
          }
        } catch (err) {
          await this.recordFailure(record.id, record.attempts, String(err));
        }
      } else if (record.entity === "reading" && record.operation === "UPDATE") {
        try {
          const payload =
            typeof record.payload === "string"
              ? JSON.parse(record.payload)
              : record.payload;

          const success = await this.apiAdapter.putReading(
            record.entityId,
            payload,
          );
          if (success) {
            await this.db.runAsync(
              "UPDATE sync_outbox SET status = 'synced' WHERE id = ?",
              [record.id],
            );
          } else {
            await this.recordFailure(
              record.id,
              record.attempts,
              "Failed to put reading to API",
            );
          }
        } catch (err) {
          await this.recordFailure(record.id, record.attempts, String(err));
        }
      } else if (record.entity === "reading" && record.operation === "DELETE") {
        try {
          const success = await this.apiAdapter.deleteReading(record.entityId);
          if (success) {
            await this.db.runAsync(
              "UPDATE sync_outbox SET status = 'synced' WHERE id = ?",
              [record.id],
            );
          } else {
            await this.recordFailure(
              record.id,
              record.attempts,
              "Failed to delete reading from API",
            );
          }
        } catch (err) {
          await this.recordFailure(record.id, record.attempts, String(err));
        }
      } else if (record.entity === "reading_log") {
        // reading_log sync is not yet implemented on the remote API.
        // Mark as synced so these records do not accumulate in the outbox forever.
        await this.db.runAsync(
          "UPDATE sync_outbox SET status = 'synced' WHERE id = ?",
          [record.id],
        );
      }
    }

    // Purge old synced records
    await this.db.runAsync("DELETE FROM sync_outbox WHERE status = 'synced'");
  }

  /**
   * Pulls new/updated readings from remote API into local SQLite.
   * Avoids restoring readings that are pending deletion in the local outbox.
   */
  async pullRemoteUpdates(): Promise<void> {
    const remoteReadings = await this.apiAdapter.fetchReadings();
    if (remoteReadings.length === 0) return;

    // Identify readings with any pending local mutation to prevent remote data
    // from overwriting uncommitted local edits (DELETE or UPDATE).
    const pendingMutations = await this.db.getAllAsync<{ entityId: string }>(
      "SELECT entity_id AS entityId FROM sync_outbox WHERE entity = 'reading' AND operation IN ('DELETE', 'UPDATE') AND status = 'pending'",
    );
    const deletedIds = new Set(pendingMutations.map((r) => r.entityId));

    for (const reading of remoteReadings) {
      if (deletedIds.has(reading.id)) {
        continue;
      }

      // Upsert reading into local SQLite
      await this.db.runAsync(
        `INSERT INTO meditation_readings (id, author_id, created_at)
         VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET author_id = excluded.author_id`,
        [reading.id, reading.authorId, reading.createdAt.toISOString()],
      );

      for (const [loc, t] of Object.entries(reading.translations)) {
        if (!t) continue;
        await this.db.runAsync(
          `INSERT INTO meditation_reading_translations (reading_id, locale, title, content)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(reading_id, locale) DO UPDATE SET title = excluded.title, content = excluded.content`,
          [reading.id, loc, t.title, t.content],
        );
      }

      const activeLocales = Object.keys(reading.translations).filter((loc) =>
        Boolean(reading.translations[loc as keyof typeof reading.translations]),
      );
      if (activeLocales.length > 0) {
        const placeholders = activeLocales.map(() => "?").join(", ");
        await this.db.runAsync(
          `DELETE FROM meditation_reading_translations WHERE reading_id = ? AND locale NOT IN (${placeholders})`,
          [reading.id, ...activeLocales],
        );
      }
    }
  }
}
