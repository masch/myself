import { type SQLiteDatabase } from "expo-sqlite";
import { queryClient } from "../query/query-client";
import { HttpReadingApiAdapter } from "../../features/readings/infrastructure/http-reading-api.adapter";
import type { SyncOutboxRecord } from "./types";
import { type CreateReadingInput, type ErrorHandlerPort } from "@myself/shared";
import { appErrorHandler } from "../errors/mobile-error-handler";
import { ApiHttpError, ApiNetworkError, ApiTimeoutError } from "../http/errors";

const MAX_SYNC_ATTEMPTS = 5;

/**
 * Identifies transient connectivity failures by API error type or message text
 * so the outbox can keep them pending. Returns false for non-transient client errors (4xx).
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  // 1. ApiHttpError: 4xx client errors (e.g. 400 Bad Request, 404, 422) are non-transient poison pills.
  // 5xx and 408 Request Timeout are transient gateway/server errors.
  if (
    error instanceof ApiHttpError ||
    (typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number")
  ) {
    const status = (error as { status: number }).status;
    return status === 408 || status >= 500;
  }

  // 2. ApiNetworkError or ApiTimeoutError are always transient
  if (
    error instanceof ApiNetworkError ||
    error instanceof ApiTimeoutError ||
    (error instanceof Error &&
      (error.name === "ApiNetworkError" ||
        error.name === "ApiTimeoutError" ||
        error.name === "AbortError"))
  ) {
    return true;
  }

  // 3. Network connection/transport errors (string or Error message)
  const str = String(error).toLowerCase();
  return (
    str.includes("network") ||
    str.includes("timeout") ||
    str.includes("timed out") ||
    str.includes("failed to fetch") ||
    str.includes("connection refused") ||
    str.includes("abort") ||
    str.includes("offline")
  );
}

export class SyncEngine {
  private isSyncing = false;
  private isPushing = false;

  constructor(
    private readonly db: SQLiteDatabase,
    private readonly apiAdapter: HttpReadingApiAdapter = new HttpReadingApiAdapter(),
    private readonly errorHandler: ErrorHandlerPort = appErrorHandler,
  ) {}

  /**
   * Dispatches push and pull synchronization.
   */
  async syncAll(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      await this.db.runAsync(
        "UPDATE sync_outbox SET status = 'pending', attempts = 0 WHERE status = 'failed' AND (last_error LIKE '%network%' OR last_error LIKE '%timeout%' OR last_error LIKE '%failed to fetch%' OR last_error LIKE '%connection refused%' OR last_error LIKE '%abort%' OR last_error LIKE '%offline%')",
      );
      await this.pushPendingOutbox();
      await this.pullRemoteUpdates();
      await queryClient.invalidateQueries({ queryKey: ["readings"] });
    } catch (error) {
      this.errorHandler.handle(error, { source: "SyncEngine.syncAll" });
    } finally {
      this.isSyncing = false;
    }
  }

  private async recordFailure(
    recordId: string,
    attempts: number,
    errorMsg: string,
    isTransient = false,
  ): Promise<void> {
    const nextAttempts = attempts + 1;
    const nextStatus =
      !isTransient && nextAttempts >= MAX_SYNC_ATTEMPTS ? "failed" : "pending";
    await this.db.runAsync(
      "UPDATE sync_outbox SET attempts = ?, status = ?, last_error = ? WHERE id = ?",
      [nextAttempts, nextStatus, errorMsg, recordId],
    );
    this.errorHandler.handle(new Error(errorMsg), {
      source: "SyncEngine.recordFailure",
      recordId,
      attempts: nextAttempts,
      status: nextStatus,
    });
  }

  /**
   * Drains pending records from sync_outbox to remote API.
   */
  async pushPendingOutbox(): Promise<void> {
    if (this.isPushing) return;
    this.isPushing = true;

    try {
      const pending = await this.db.getAllAsync<SyncOutboxRecord>(
        // Order by dependency hierarchy (independent parent entities like authors must sync before dependent readings)
        // and disambiguate using physical insertion order (rowid ASC) instead of random UUIDs.
        "SELECT id, entity, entity_id AS entityId, operation, payload, status, attempts, last_error AS lastError, created_at AS createdAt FROM sync_outbox WHERE status = 'pending' ORDER BY CASE entity WHEN 'author' THEN 1 WHEN 'reading' THEN 2 ELSE 3 END ASC, rowid ASC",
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
              if (remoteAuthorId !== record.entityId) {
                // Fetch pending readings to update before opening write transaction
                const pendingReadings = await this.db.getAllAsync<{
                  id: string;
                  payload: string;
                }>(
                  "SELECT id, payload FROM sync_outbox WHERE entity = 'reading' AND status = 'pending'",
                );

                const updatesToApply: { id: string; payload: string }[] = [];
                for (const readingRec of pendingReadings) {
                  try {
                    const parsed =
                      typeof readingRec.payload === "string"
                        ? JSON.parse(readingRec.payload)
                        : readingRec.payload;
                    if (parsed.authorId === record.entityId) {
                      parsed.authorId = remoteAuthorId;
                      updatesToApply.push({
                        id: readingRec.id,
                        payload: JSON.stringify(parsed),
                      });
                    }
                  } catch {
                    // Ignore parse error
                  }
                }

                await this.db.withTransactionAsync(async () => {
                  await this.db.runAsync(
                    "UPDATE authors SET id = ? WHERE id = ?",
                    [remoteAuthorId, record.entityId],
                  );
                  await this.db.runAsync(
                    "UPDATE meditation_readings SET author_id = ? WHERE author_id = ?",
                    [remoteAuthorId, record.entityId],
                  );
                  for (const upd of updatesToApply) {
                    await this.db.runAsync(
                      "UPDATE sync_outbox SET payload = ? WHERE id = ?",
                      [upd.payload, upd.id],
                    );
                  }
                  await this.db.runAsync(
                    "UPDATE sync_outbox SET status = 'synced' WHERE id = ?",
                    [record.id],
                  );
                });

                // Remap in active in-memory queue for remaining items in this drain cycle
                for (const item of pending) {
                  if (item.entity === "reading") {
                    try {
                      const parsed =
                        typeof item.payload === "string"
                          ? JSON.parse(item.payload)
                          : item.payload;
                      if (parsed.authorId === record.entityId) {
                        parsed.authorId = remoteAuthorId;
                        item.payload = JSON.stringify(parsed);
                      }
                    } catch {
                      // Ignore parse error
                    }
                  }
                }
              } else {
                await this.db.runAsync(
                  "UPDATE sync_outbox SET status = 'synced' WHERE id = ?",
                  [record.id],
                );
              }
            } else {
              await this.recordFailure(
                record.id,
                record.attempts,
                "Server returned null author ID",
                false,
              );
              break;
            }
          } catch (err) {
            const isTransient = isNetworkError(err);
            await this.recordFailure(
              record.id,
              record.attempts,
              String(err),
              isTransient,
            );
            break;
          }
        } else if (
          record.entity === "reading" &&
          record.operation === "CREATE"
        ) {
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
                false,
              );
              break;
            }
          } catch (err) {
            const isTransient = isNetworkError(err);
            await this.recordFailure(
              record.id,
              record.attempts,
              String(err),
              isTransient,
            );
            break;
          }
        } else if (
          record.entity === "reading" &&
          record.operation === "UPDATE"
        ) {
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
                false,
              );
              break;
            }
          } catch (err) {
            const isTransient = isNetworkError(err);
            await this.recordFailure(
              record.id,
              record.attempts,
              String(err),
              isTransient,
            );
            break;
          }
        } else if (
          record.entity === "reading" &&
          record.operation === "DELETE"
        ) {
          try {
            const success = await this.apiAdapter.deleteReading(
              record.entityId,
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
                "Failed to delete reading from API",
                false,
              );
              break;
            }
          } catch (err) {
            const isTransient = isNetworkError(err);
            await this.recordFailure(
              record.id,
              record.attempts,
              String(err),
              isTransient,
            );
            break;
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
    } finally {
      this.isPushing = false;
    }
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
