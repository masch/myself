import { describe, expect, it, beforeEach, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { type SQLiteDatabase } from "expo-sqlite";
import { SyncEngine } from "../sync-engine";
import type { ErrorHandlerPort } from "@myself/shared";
import type { HttpReadingApiAdapter } from "../../../features/readings/infrastructure/http-reading-api.adapter";

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
  } as unknown as SQLiteDatabase;
}

describe("SyncEngine", () => {
  let rawDb: Database;
  let db: SQLiteDatabase;
  let mockHandler: ErrorHandlerPort;

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
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meditation_reading_translations (
        reading_id TEXT NOT NULL,
        locale TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        PRIMARY KEY (reading_id, locale)
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
    db = createExpoSqliteAdapter(rawDb);
    mockHandler = {
      handle: mock(() => {}),
    };
  });

  it("handles and reports errors in syncAll when an unexpected failure occurs", async () => {
    const brokenDb = {
      getAllAsync: mock(() => Promise.reject(new Error("Disk I/O error"))),
      runAsync: mock(() => Promise.resolve()),
    } as unknown as SQLiteDatabase;

    const engine = new SyncEngine(
      brokenDb,
      {} as HttpReadingApiAdapter,
      mockHandler,
    );

    await engine.syncAll();

    expect(mockHandler.handle).toHaveBeenCalledTimes(1);
    expect(mockHandler.handle).toHaveBeenCalledWith(expect.any(Error), {
      source: "SyncEngine.syncAll",
    });
  });

  it("records failure and calls errorHandler when an API push fails", async () => {
    rawDb.run(`
      INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, attempts, created_at)
      VALUES ('outbox-1', 'author', 'author-1', 'CREATE', '{"name":"Seneca"}', 'pending', 0, '2026-01-01T00:00:00Z');
    `);

    const mockApi = {
      postAuthor: mock(() => Promise.reject(new Error("Network timeout"))),
      fetchReadings: mock(() => Promise.resolve([])),
    } as unknown as HttpReadingApiAdapter;

    const engine = new SyncEngine(db, mockApi, mockHandler);

    await engine.pushPendingOutbox();

    // Outbox should be updated with attempts = 1, status = 'pending', and last_error
    const record = rawDb
      .query(
        "SELECT attempts, status, last_error FROM sync_outbox WHERE id = 'outbox-1'",
      )
      .get() as { attempts: number; status: string; last_error: string };

    expect(record.attempts).toBe(1);
    expect(record.status).toBe("pending");
    expect(record.last_error).toContain("Network timeout");

    expect(mockHandler.handle).toHaveBeenCalledTimes(1);
    expect(mockHandler.handle).toHaveBeenCalledWith(expect.any(Error), {
      source: "SyncEngine.recordFailure",
      recordId: "outbox-1",
      attempts: 1,
      status: "pending",
    });
  });

  it("pushes pending author and purges synced records on success", async () => {
    rawDb.run(`
      INSERT INTO authors (id, name) VALUES ('local-auth-1', 'Marcus Aurelius');
      INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, attempts, created_at)
      VALUES ('outbox-2', 'author', 'local-auth-1', 'CREATE', '{"name":"Marcus Aurelius"}', 'pending', 0, '2026-01-01T00:00:00Z');
    `);

    const mockApi = {
      postAuthor: mock(() => Promise.resolve("remote-auth-1")),
      fetchReadings: mock(() => Promise.resolve([])),
    } as unknown as HttpReadingApiAdapter;

    const engine = new SyncEngine(db, mockApi, mockHandler);

    await engine.pushPendingOutbox();

    // Local author id should have been updated to remote id
    const author = rawDb.query("SELECT id, name FROM authors").get() as {
      id: string;
      name: string;
    };
    expect(author.id).toBe("remote-auth-1");

    // Synced outbox records are purged
    const outboxCount = rawDb
      .query("SELECT count(*) as count FROM sync_outbox")
      .get() as { count: number };
    expect(outboxCount.count).toBe(0);

    expect(mockHandler.handle).not.toHaveBeenCalled();
  });
});
