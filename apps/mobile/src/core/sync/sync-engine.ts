import { type SQLiteDatabase } from "expo-sqlite";
import { queryClient } from "../query/query-client";
import { HttpReadingApiAdapter } from "../../features/readings/infrastructure/http-reading-api.adapter";
import type { SyncOutboxRecord } from "./types";
import { type CreateReadingInput } from "@myself/shared";

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

  /**
   * Drains pending records from sync_outbox to remote API.
   */
  async pushPendingOutbox(): Promise<void> {
    const pending = await this.db.getAllAsync<SyncOutboxRecord>(
      "SELECT id, entity, entity_id AS entityId, operation, payload, status, attempts, last_error AS lastError, created_at AS createdAt FROM sync_outbox WHERE status = 'pending' ORDER BY created_at ASC",
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
            await this.db.runAsync(
              "UPDATE sync_outbox SET attempts = attempts + 1 WHERE id = ?",
              [record.id],
            );
          }
        } catch (err) {
          await this.db.runAsync(
            "UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?",
            [String(err), record.id],
          );
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
            await this.db.runAsync(
              "UPDATE sync_outbox SET attempts = attempts + 1 WHERE id = ?",
              [record.id],
            );
          }
        } catch (err) {
          await this.db.runAsync(
            "UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?",
            [String(err), record.id],
          );
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
            await this.db.runAsync(
              "UPDATE sync_outbox SET attempts = attempts + 1 WHERE id = ?",
              [record.id],
            );
          }
        } catch (err) {
          await this.db.runAsync(
            "UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?",
            [String(err), record.id],
          );
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
            await this.db.runAsync(
              "UPDATE sync_outbox SET attempts = attempts + 1 WHERE id = ?",
              [record.id],
            );
          }
        } catch (err) {
          await this.db.runAsync(
            "UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?",
            [String(err), record.id],
          );
        }
      }
    }

    // Purge old synced records
    await this.db.runAsync("DELETE FROM sync_outbox WHERE status = 'synced'");
  }

  /**
   * Pulls new/updated readings from remote API into local SQLite.
   */
  async pullRemoteUpdates(): Promise<void> {
    const remoteReadings = await this.apiAdapter.fetchReadings();
    if (remoteReadings.length === 0) return;

    for (const reading of remoteReadings) {
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
    }
  }
}
