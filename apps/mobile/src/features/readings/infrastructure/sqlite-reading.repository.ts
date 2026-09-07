import { type SQLiteDatabase } from "expo-sqlite";
import {
  Reading,
  DateTime,
  type EntityId,
  type SupportedLocale,
  type ReadingTranslationsMap,
} from "@myself/shared";
import type { IReadingRepository } from "../domain/reading.repository";
import { generateUUID } from "@/utils/uuid";

interface RawReadingRecord {
  id: EntityId;
  author_id: EntityId;
  created_at: string;
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
  constructor(private readonly db: SQLiteDatabase) {}

  async getAll(locale: SupportedLocale = "es"): Promise<Reading[]> {
    const rawReadings = await this.db.getAllAsync<RawReadingRecord>(
      "SELECT id, author_id, created_at FROM meditation_readings ORDER BY created_at DESC",
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
        }),
      );
    }

    return readings;
  }

  async getById(id: EntityId): Promise<Reading | null> {
    const raw = await this.db.getFirstAsync<RawReadingRecord>(
      "SELECT id, author_id, created_at FROM meditation_readings WHERE id = ?",
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
    });
  }

  async save(reading: Reading): Promise<void> {
    const outboxId = generateUUID();
    const payload = JSON.stringify({
      id: reading.id,
      authorId: reading.authorId,
      translations: reading.translations,
    });

    const existing = await this.db.getFirstAsync<{ id: string }>(
      "SELECT id FROM meditation_readings WHERE id = ?",
      [reading.id],
    );
    const operation = existing ? "UPDATE" : "CREATE";

    await this.db.withTransactionAsync(async () => {
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

      await this.db.runAsync(
        `INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, created_at)
         VALUES (?, 'reading', ?, ?, ?, 'pending', datetime('now'))`,
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

      await this.db.runAsync(
        `INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, created_at)
         VALUES (?, 'reading', ?, 'DELETE', '{}', 'pending', datetime('now'))`,
        [outboxId, id],
      );
    });
  }

  async recordLog(readingId: EntityId): Promise<string> {
    const logId = generateUUID();
    const outboxId = generateUUID();
    const now = new Date().toISOString();
    const payload = JSON.stringify({ id: logId, readingId, readAt: now });

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        "INSERT INTO reading_logs (id, reading_id, read_at) VALUES (?, ?, ?)",
        [logId, readingId, now],
      );

      await this.db.runAsync(
        `INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, created_at)
         VALUES (?, 'reading_log', ?, 'CREATE', ?, 'pending', datetime('now'))`,
        [outboxId, readingId, payload],
      );
    });

    return logId;
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
         VALUES (?, 'reading_log', ?, 'DELETE', '{}', 'pending', datetime('now'))`,
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
