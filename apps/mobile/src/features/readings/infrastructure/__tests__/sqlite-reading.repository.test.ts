import { describe, expect, it, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { type SQLiteDatabase } from "expo-sqlite";
import { SqliteReadingRepository } from "../sqlite-reading.repository";
import { Reading, DateTime, generateEntityId } from "@myself/shared";

function createExpoSqliteAdapter(rawDb: Database): SQLiteDatabase {
  return {
    async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
      const stmt = rawDb.query(sql);
      return stmt.all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
      const stmt = rawDb.query(sql);
      const res = stmt.get(...params) as T | undefined;
      return res ?? null;
    },
    async runAsync(sql: string, params: any[] = []): Promise<any> {
      const stmt = rawDb.query(sql);
      return stmt.run(...params);
    },
    async execAsync(sql: string): Promise<void> {
      rawDb.run(sql);
    },
    async withTransactionAsync<T>(callback: () => Promise<T>): Promise<T> {
      rawDb.run("BEGIN IMMEDIATE;");
      try {
        const result = await callback();
        rawDb.run("COMMIT;");
        return result;
      } catch (err) {
        rawDb.run("ROLLBACK;");
        throw err;
      }
    },
  } as unknown as SQLiteDatabase;
}

describe("SqliteReadingRepository: Outbox Mutation Coalescing", () => {
  let rawDb: Database;
  let db: SQLiteDatabase;
  let repo: SqliteReadingRepository;
  const authorId = generateEntityId();

  beforeEach(() => {
    rawDb = new Database(":memory:");
    rawDb.run(`
      CREATE TABLE IF NOT EXISTS authors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meditation_readings (
        id TEXT PRIMARY KEY,
        author_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS meditation_reading_translations (
        reading_id TEXT NOT NULL,
        locale TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        PRIMARY KEY (reading_id, locale)
      );
      CREATE TABLE IF NOT EXISTS reading_logs (
        id TEXT PRIMARY KEY,
        reading_id TEXT NOT NULL,
        read_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL
      );
    `);

    rawDb.run(
      `INSERT INTO authors (id, name) VALUES ('${authorId}', 'Marcus Aurelius')`,
    );

    db = createExpoSqliteAdapter(rawDb);
    repo = new SqliteReadingRepository(db);
  });

  it("Scenario 1: CREATE + DELETE cancels out and purges pending outbox record locally", async () => {
    const readingId = generateEntityId();
    const reading = new Reading({
      id: readingId,
      authorId,
      createdAt: DateTime.now(),
      readDates: [],
      translations: {
        es: { title: "Offline Draft", content: "To be deleted" },
      },
    });

    // 1. Create reading offline
    await repo.save(reading);

    const pendingAfterCreate = await db.getAllAsync<{ operation: string }>(
      "SELECT operation FROM sync_outbox WHERE entity_id = ? AND status = 'pending'",
      [readingId],
    );
    expect(pendingAfterCreate.length).toBe(1);
    expect(pendingAfterCreate[0].operation).toBe("CREATE");

    // 2. Delete reading offline before syncing
    await repo.delete(readingId);

    // With coalescing: CREATE + DELETE => 0 records in outbox
    const pendingAfterDelete = await db.getAllAsync(
      "SELECT * FROM sync_outbox WHERE entity_id = ? AND status = 'pending'",
      [readingId],
    );
    expect(pendingAfterDelete.length).toBe(0);
  });

  it("Scenario 2: CREATE + UPDATE squashes into a single CREATE with updated payload", async () => {
    const readingId = generateEntityId();
    const readingDraft = new Reading({
      id: readingId,
      authorId,
      createdAt: DateTime.now(),
      readDates: [],
      translations: {
        es: { title: "Draft Title", content: "Initial content" },
      },
    });

    await repo.save(readingDraft);

    const readingUpdated = new Reading({
      id: readingId,
      authorId,
      createdAt: DateTime.now(),
      readDates: [],
      translations: {
        es: { title: "Final Polished Title", content: "Final content" },
      },
    });

    await repo.save(readingUpdated);

    const pending = await db.getAllAsync<{
      operation: string;
      payload: string;
    }>(
      "SELECT operation, payload FROM sync_outbox WHERE entity_id = ? AND status = 'pending'",
      [readingId],
    );

    expect(pending.length).toBe(1);
    expect(pending[0].operation).toBe("CREATE");
    const payload = JSON.parse(pending[0].payload);
    expect(payload.translations.es.title).toBe("Final Polished Title");
  });

  it("Scenario 3: UPDATE + UPDATE squashes into a single UPDATE with latest payload", async () => {
    const readingId = generateEntityId();
    // Simulate reading already synced from remote
    rawDb.run(
      `INSERT INTO meditation_readings (id, author_id, created_at) VALUES ('${readingId}', '${authorId}', '2026-01-01T00:00:00Z')`,
    );
    rawDb.run(
      `INSERT INTO meditation_reading_translations (reading_id, locale, title, content) VALUES ('${readingId}', 'es', 'Base Title', 'Base content')`,
    );

    const readingUpdate1 = new Reading({
      id: readingId,
      authorId,
      createdAt: DateTime.now(),
      readDates: [],
      translations: {
        es: { title: "Update 1", content: "Content 1" },
      },
    });

    await repo.save(readingUpdate1);

    const readingUpdate2 = new Reading({
      id: readingId,
      authorId,
      createdAt: DateTime.now(),
      readDates: [],
      translations: {
        es: { title: "Update 2 (Final)", content: "Content 2 (Final)" },
      },
    });

    await repo.save(readingUpdate2);

    const pending = await db.getAllAsync<{
      operation: string;
      payload: string;
    }>(
      "SELECT operation, payload FROM sync_outbox WHERE entity_id = ? AND status = 'pending'",
      [readingId],
    );

    expect(pending.length).toBe(1);
    expect(pending[0].operation).toBe("UPDATE");
    const payload = JSON.parse(pending[0].payload);
    expect(payload.translations.es.title).toBe("Update 2 (Final)");
  });

  it("Scenario 4: UPDATE + DELETE replaces pending updates with a single DELETE", async () => {
    const readingId = generateEntityId();
    // Simulate reading already synced from remote
    rawDb.run(
      `INSERT INTO meditation_readings (id, author_id, created_at) VALUES ('${readingId}', '${authorId}', '2026-01-01T00:00:00Z')`,
    );
    rawDb.run(
      `INSERT INTO meditation_reading_translations (reading_id, locale, title, content) VALUES ('${readingId}', 'es', 'Base Title', 'Base content')`,
    );

    const readingUpdate = new Reading({
      id: readingId,
      authorId,
      createdAt: DateTime.now(),
      readDates: [],
      translations: {
        es: { title: "Temporary Edit", content: "Edit content" },
      },
    });

    await repo.save(readingUpdate);
    await repo.delete(readingId);

    const pending = await db.getAllAsync<{ operation: string }>(
      "SELECT operation FROM sync_outbox WHERE entity_id = ? AND status = 'pending'",
      [readingId],
    );

    expect(pending.length).toBe(1);
    expect(pending[0].operation).toBe("DELETE");
  });
});
