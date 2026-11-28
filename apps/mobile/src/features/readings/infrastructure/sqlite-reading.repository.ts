import { type SQLiteDatabase } from "expo-sqlite";
import {
  Reading,
  DateTime,
  type EntityId,
  type SupportedLocale,
  type ReadingTranslationsMap,
} from "@myself/shared";
import type {
  CurrentUserPort,
  IReadingRepository,
} from "../domain/reading.repository";
import { generateUUID } from "@/utils/uuid";

interface RawReadingRecord {
  id: EntityId;
  author_id: EntityId;
  created_at: string;
  version?: number;
}

interface RawTranslationRecord {
  reading_id: string;
  locale: string;
  title: string;
  content: string;
}

interface RawLogRecord {
  id: string;
  read_at: string;
}

export class SqliteReadingRepository implements IReadingRepository {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly currentUser: CurrentUserPort,
  ) {}

  async getAll(locale: SupportedLocale = "es"): Promise<Reading[]> {
    const rawReadings = await this.db.getAllAsync<RawReadingRecord>(
      "SELECT id, author_id, created_at, version FROM meditation_readings ORDER BY created_at DESC",
    );

    if (rawReadings.length === 0) {
      return [];
    }

    const readings: Reading[] = [];

    for (const raw of rawReadings) {
      const translations = await this.db.getAllAsync<RawTranslationRecord>(
        "SELECT reading_id, locale, title, content FROM meditation_reading_translations WHERE reading_id = ?",
        [raw.id],
      );

      const logs = await this.db.getAllAsync<RawLogRecord>(
        "SELECT id, read_at FROM reading_logs WHERE reading_id = ?",
        [raw.id],
      );

      const transMap: ReadingTranslationsMap = {
        es: { title: "", content: "" },
      };

      for (const t of translations) {
        if (t.locale === "es" || t.locale === "en") {
          transMap[t.locale as SupportedLocale] = {
            title: t.title,
            content: t.content,
          };
        }
      }

      readings.push(
        new Reading({
          id: raw.id,
          authorId: raw.author_id,
          createdAt: DateTime.from(raw.created_at),
          readDates: logs.map((l) => DateTime.from(l.read_at)),
          translations: transMap,
          version: raw.version,
        }),
      );
    }

    return readings;
  }

  async getById(id: EntityId): Promise<Reading | null> {
    const raw = await this.db.getFirstAsync<RawReadingRecord>(
      "SELECT id, author_id, created_at, version FROM meditation_readings WHERE id = ?",
      [id],
    );

    if (!raw) return null;

    const translations = await this.db.getAllAsync<RawTranslationRecord>(
      "SELECT reading_id, locale, title, content FROM meditation_reading_translations WHERE reading_id = ?",
      [raw.id],
    );

    const logs = await this.db.getAllAsync<RawLogRecord>(
      "SELECT id, read_at FROM reading_logs WHERE reading_id = ?",
      [raw.id],
    );

    const transMap: ReadingTranslationsMap = {
      es: { title: "", content: "" },
    };

    for (const t of translations) {
      if (t.locale === "es" || t.locale === "en") {
        transMap[t.locale as SupportedLocale] = {
          title: t.title,
          content: t.content,
        };
      }
    }

    return new Reading({
      id: raw.id,
      authorId: raw.author_id,
      createdAt: DateTime.from(raw.created_at),
      readDates: logs.map((l) => DateTime.from(l.read_at)),
      translations: transMap,
      version: raw.version,
    });
  }

  async save(reading: Reading): Promise<void> {
    const outboxId = generateUUID();
    const payload = JSON.stringify({
      id: reading.id,
      authorId: reading.authorId,
      translations: reading.translations,
      version: reading.version,
    });

    await this.db.withTransactionAsync(async () => {
      // Check existence inside the transaction to avoid a race condition with
      // SyncEngine.pullRemoteUpdates, which could upsert the same ID between
      // the check and the write and cause CREATE to be queued for an existing record.
      const existing = await this.db.getFirstAsync<{ id: string }>(
        "SELECT id FROM meditation_readings WHERE id = ?",
        [reading.id],
      );
      const operation = existing ? "UPDATE" : "CREATE";

      await this.db.runAsync(
        `INSERT INTO meditation_readings (id, author_id, created_at, version)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET author_id = excluded.author_id, version = excluded.version`,
        [
          reading.id,
          reading.authorId,
          reading.createdAt.toISOString(),
          reading.version,
        ],
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

      // Outbox Mutation Coalescing (Issue #70, Phase 2)
      const pendingRecords = await this.db.getAllAsync<{
        id: string;
        operation: string;
      }>(
        "SELECT id, operation FROM sync_outbox WHERE entity = 'reading' AND entity_id = ? AND status = 'pending' ORDER BY rowid ASC",
        [reading.id],
      );

      const pendingCreate = pendingRecords.find(
        (r) => r.operation === "CREATE",
      );
      if (pendingCreate) {
        // CREATE + UPDATE => Squash into existing pending CREATE with latest payload
        await this.db.runAsync(
          "UPDATE sync_outbox SET payload = ?, created_at = strftime('%Y-%m-%dT%H:%M:%f', 'now') WHERE id = ?",
          [payload, pendingCreate.id],
        );
        // Clean up any extraneous pending updates if any exist
        await this.db.runAsync(
          "DELETE FROM sync_outbox WHERE entity = 'reading' AND entity_id = ? AND status = 'pending' AND id != ?",
          [reading.id, pendingCreate.id],
        );
        return;
      }

      const pendingUpdate = pendingRecords.find(
        (r) => r.operation === "UPDATE",
      );
      if (pendingUpdate) {
        // UPDATE + UPDATE => Squash into existing pending UPDATE with latest payload
        await this.db.runAsync(
          "UPDATE sync_outbox SET payload = ?, created_at = strftime('%Y-%m-%dT%H:%M:%f', 'now') WHERE id = ?",
          [payload, pendingUpdate.id],
        );
        return;
      }

      // No coalescible pending record; enqueue standard mutation
      await this.db.runAsync(
        `INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, created_at)
         VALUES (?, 'reading', ?, ?, ?, 'pending', strftime('%Y-%m-%dT%H:%M:%f', 'now'))`,
        [outboxId, reading.id, operation, payload],
      );
    });
  }

  async delete(id: EntityId): Promise<void> {
    const outboxId = generateUUID();
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync("DELETE FROM meditation_readings WHERE id = ?", [
        id,
      ]);

      // Outbox Mutation Coalescing (Issue #70, Phase 2)
      const pendingRecords = await this.db.getAllAsync<{
        id: string;
        operation: string;
      }>(
        "SELECT id, operation FROM sync_outbox WHERE entity = 'reading' AND entity_id = ? AND status = 'pending'",
        [id],
      );

      const hasPendingCreate = pendingRecords.some(
        (r) => r.operation === "CREATE",
      );

      if (hasPendingCreate) {
        // CREATE + DELETE => Purge locally without transmitting any remote requests
        await this.db.runAsync(
          "DELETE FROM sync_outbox WHERE entity = 'reading' AND entity_id = ? AND status = 'pending'",
          [id],
        );
      } else {
        // UPDATE + DELETE or standalone DELETE => Discard prior pending updates and enqueue single DELETE
        await this.db.runAsync(
          "DELETE FROM sync_outbox WHERE entity = 'reading' AND entity_id = ? AND status = 'pending'",
          [id],
        );
        await this.db.runAsync(
          `INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, created_at)
           VALUES (?, 'reading', ?, 'DELETE', '{}', 'pending', strftime('%Y-%m-%dT%H:%M:%f', 'now'))`,
          [outboxId, id],
        );
      }
    });
  }

  async recordLog(readingId: EntityId): Promise<string> {
    const logId = generateUUID();
    const outboxId = generateUUID();
    const now = DateTime.now().toISOString();
    // Resolved per insert, never captured at construction: the same repository writes
    // before and after a sign-in, and read history is a local counter that must not be
    // lost because nobody is signed in (S21). The outbox payload is unchanged — the
    // reading_log push branch is still a no-op (S10).
    const userId = this.currentUser.currentUserId();
    const payload = JSON.stringify({ id: logId, readingId, readAt: now });

    await this.db.withTransactionAsync(async () => {
      await this.insertLogWithAttribution({
        logId,
        readingId,
        readAt: now,
        userId,
      });

      await this.db.runAsync(
        `INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, created_at)
         VALUES (?, 'reading_log', ?, 'CREATE', ?, 'pending', strftime('%Y-%m-%dT%H:%M:%f', 'now'))`,
        [outboxId, readingId, payload],
      );
    });

    return logId;
  }

  /**
   * Writes one log row with its owner when the owner can be referenced, and unattributed
   * otherwise (S21).
   *
   * A read is never lost: `reading_logs.user_id` is a foreign key with
   * `PRAGMA foreign_keys = ON`, so a session whose local identity mirror refused to write a
   * row (`invalid-id`, `invalid-profile`, `email-owned-by-another-profile`) would otherwise
   * fail the insert and take the read with it. Losing a read is worse than losing its
   * attribution, so the row is written with `user_id` NULL and the loss is reported through
   * the repository's warning seam rather than swallowed.
   *
   * The check is one primary-key probe inside the caller's transaction, and only when a
   * session exists: the signed-out case writes NULL without asking. The healthy path adds
   * that single lookup — no exception, no second statement, no retry. The probe cannot close
   * the gap between reading the answer and writing the row, so an attributed insert that
   * still fails falls back to the unattributed write it was probing for instead of
   * propagating a constraint error; the retry is the `ABORT` rollback of one statement, which
   * leaves the surrounding transaction usable, and it is only reached when the row is gone.
   */
  private async insertLogWithAttribution(log: {
    logId: string;
    readingId: EntityId;
    readAt: string;
    userId: string | null;
  }): Promise<void> {
    const { userId } = log;

    if (userId === null) {
      await this.insertLog(log, null);
      return;
    }

    const owner = await this.db.getFirstAsync<{ id: string }>(
      'SELECT id FROM "user" WHERE id = ?',
      [userId],
    );

    if (!owner) {
      await this.insertLog(log, null);
      this.warnUnattributed(log, 'it has no row in the device "user" table');
      return;
    }

    try {
      await this.insertLog(log, userId);
    } catch {
      await this.insertLog(log, null);
      this.warnUnattributed(
        log,
        'its row in the device "user" table disappeared before the insert could reference it',
      );
    }
  }

  /** One insert, in one place, so the attributed and unattributed writes cannot drift. */
  private async insertLog(
    log: { logId: string; readingId: EntityId; readAt: string },
    userId: string | null,
  ): Promise<void> {
    await this.db.runAsync(
      "INSERT INTO reading_logs (id, reading_id, read_at, user_id) VALUES (?, ?, ?, ?)",
      [log.logId, log.readingId, log.readAt, userId],
    );
  }

  /**
   * Says out loud that a read was recorded without its owner.
   *
   * `console.warn` is what this codebase already uses for a degraded-but-continuing write
   * (`HttpReadingApiAdapter` warns the same way), so this stays a warning and not an error:
   * the read was stored, only its attribution was not.
   */
  private warnUnattributed(
    log: { logId: string; readingId: EntityId; userId: string | null },
    reason: string,
  ): void {
    console.warn(
      `[SqliteReadingRepository] Read ${log.logId} of reading ${log.readingId} was recorded with user_id NULL: the signed-in user ${log.userId} cannot be referenced because ${reason}.`,
    );
  }

  async deleteLastLog(readingId: EntityId): Promise<void> {
    const outboxId = generateUUID();
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `DELETE FROM reading_logs 
         WHERE id = (
           SELECT id FROM reading_logs 
           WHERE reading_id = ? 
           ORDER BY read_at DESC 
           LIMIT 1
         )`,
        [readingId],
      );

      await this.db.runAsync(
        `INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, created_at)
         VALUES (?, 'reading_log', ?, 'DELETE', '{}', 'pending', strftime('%Y-%m-%dT%H:%M:%f', 'now'))`,
        [outboxId, readingId],
      );
    });
  }

  async getLogs(
    readingId: EntityId,
  ): Promise<{ id: string; readAt: string }[]> {
    const logs = await this.db.getAllAsync<RawLogRecord>(
      "SELECT id, read_at FROM reading_logs WHERE reading_id = ? ORDER BY read_at DESC",
      [readingId],
    );
    return logs.map((l) => ({ id: l.id, readAt: l.read_at }));
  }
}
