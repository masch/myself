import { describe, expect, it, beforeEach, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { type SQLiteDatabase } from "expo-sqlite";
import { SyncEngine } from "../sync-engine";
import type { ErrorHandlerPort } from "@myself/shared";
import type { HttpReadingApiAdapter } from "../../../features/readings/infrastructure/http-reading-api.adapter";
import { ApiHttpError } from "../../../infrastructure/http/errors";

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

  it("pushes pending author before dependent reading even when timestamps match and reading has smaller id", async () => {
    // Both records have the exact same created_at timestamp.
    // The reading has id '0000-reading' which sorts before 'zzzz-author' alphabetically.
    rawDb.run(`
      INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, attempts, created_at)
      VALUES 
        ('0000-reading', 'reading', 'reading-1', 'CREATE', '{"id":"reading-1","authorId":"author-1","translations":{"es":{"title":"T","content":"C"}}}', 'pending', 0, '2026-01-01T00:00:00.000Z'),
        ('zzzz-author', 'author', 'author-1', 'CREATE', '{"id":"author-1","name":"Seneca"}', 'pending', 0, '2026-01-01T00:00:00.000Z');
    `);

    const callOrder: string[] = [];
    const mockApi = {
      postAuthor: mock(() => {
        callOrder.push("postAuthor");
        return Promise.resolve("author-1");
      }),
      postReading: mock(() => {
        callOrder.push("postReading");
        return Promise.resolve(true);
      }),
      fetchReadings: mock(() => Promise.resolve([])),
    } as unknown as HttpReadingApiAdapter;

    const engine = new SyncEngine(db, mockApi, mockHandler);
    await engine.pushPendingOutbox();

    expect(callOrder).toEqual(["postAuthor", "postReading"]);
  });

  it("prevents concurrent re-entrant runs of pushPendingOutbox", async () => {
    rawDb.run(`
      INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, attempts, created_at)
      VALUES ('outbox-conc-1', 'author', 'author-1', 'CREATE', '{"id":"author-1","name":"Cleanthes"}', 'pending', 0, '2026-01-01T00:00:00.000Z');
    `);

    let postCount = 0;
    const mockApi = {
      postAuthor: mock(async () => {
        postCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "author-1";
      }),
      fetchReadings: mock(() => Promise.resolve([])),
    } as unknown as HttpReadingApiAdapter;

    const engine = new SyncEngine(db, mockApi, mockHandler);

    await Promise.all([engine.pushPendingOutbox(), engine.pushPendingOutbox()]);

    expect(postCount).toBe(1);
  });

  it("does not mark outbox record as failed when error is a transient network error", async () => {
    // Record already at MAX_SYNC_ATTEMPTS - 1
    rawDb.run(`
      INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, attempts, created_at)
      VALUES ('outbox-transient-1', 'author', 'author-1', 'CREATE', '{"id":"author-1","name":"Epictetus"}', 'pending', 4, '2026-01-01T00:00:00.000Z');
    `);

    const mockApi = {
      postAuthor: mock(() =>
        Promise.reject(new Error("Network request failed: timeout")),
      ),
      fetchReadings: mock(() => Promise.resolve([])),
    } as unknown as HttpReadingApiAdapter;

    const engine = new SyncEngine(db, mockApi, mockHandler);
    await engine.pushPendingOutbox();

    const record = rawDb
      .query(
        "SELECT attempts, status FROM sync_outbox WHERE id = 'outbox-transient-1'",
      )
      .get() as { attempts: number; status: string };

    // Transient network failures must NOT transition to 'failed'
    expect(record.status).toBe("pending");
  });

  it("aborts processing remaining outbox queue immediately when an item fails", async () => {
    rawDb.run(`
      INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, attempts, created_at)
      VALUES 
        ('auth-outbox', 'author', 'author-1', 'CREATE', '{"id":"author-1","name":"Zeno"}', 'pending', 0, '2026-01-01T00:00:00.000Z'),
        ('reading-outbox', 'reading', 'reading-1', 'CREATE', '{"id":"reading-1","authorId":"author-1","translations":{"es":{"title":"T","content":"C"}}}', 'pending', 0, '2026-01-01T00:00:00.000Z');
    `);

    let readingCalled = false;
    const mockApi = {
      postAuthor: mock(() =>
        Promise.reject(new Error("Network connection lost")),
      ),
      postReading: mock(() => {
        readingCalled = true;
        return Promise.resolve(true);
      }),
      fetchReadings: mock(() => Promise.resolve([])),
    } as unknown as HttpReadingApiAdapter;

    const engine = new SyncEngine(db, mockApi, mockHandler);
    await engine.pushPendingOutbox();

    // Because author failed with network error, reading push must NOT have been attempted in this run
    expect(readingCalled).toBe(false);

    const readingRecord = rawDb
      .query(
        "SELECT attempts, status FROM sync_outbox WHERE id = 'reading-outbox'",
      )
      .get() as { attempts: number; status: string };

    // Reading should not have burned attempts
    expect(readingRecord.attempts).toBe(0);
    expect(readingRecord.status).toBe("pending");
  });

  it("remaps authorId in pending outbox reading payloads when remote returns a different author ID", async () => {
    rawDb.run(`
      INSERT INTO authors (id, name) VALUES ('local-auth-id', 'Epictetus');
      INSERT INTO meditation_readings (id, author_id, created_at)
      VALUES ('reading-1', 'local-auth-id', '2026-01-01T00:00:00.000Z');
      INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, attempts, created_at)
      VALUES 
        ('author-outbox', 'author', 'local-auth-id', 'CREATE', '{"id":"local-auth-id","name":"Epictetus"}', 'pending', 0, '2026-01-01T00:00:00.000Z'),
        ('reading-outbox', 'reading', 'reading-1', 'CREATE', '{"id":"reading-1","authorId":"local-auth-id","translations":{"es":{"title":"T","content":"C"}}}', 'pending', 0, '2026-01-01T00:00:00.000Z');
    `);

    let pushedReadingPayload: any = null;
    const mockApi = {
      postAuthor: mock(() => Promise.resolve("remote-auth-id")),
      postReading: mock((input: any) => {
        pushedReadingPayload = input;
        return Promise.resolve(true);
      }),
      fetchReadings: mock(() => Promise.resolve([])),
    } as unknown as HttpReadingApiAdapter;

    const engine = new SyncEngine(db, mockApi, mockHandler);
    await engine.pushPendingOutbox();

    expect(pushedReadingPayload).not.toBeNull();
    // Must be updated to the new remote author id!
    expect(pushedReadingPayload.authorId).toBe("remote-auth-id");
  });

  it("marks outbox record as failed when error is a non-transient 400 Bad Request", async () => {
    // Record already at MAX_SYNC_ATTEMPTS - 1 (4 attempts)
    rawDb.run(`
      INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, attempts, created_at)
      VALUES ('outbox-http-400', 'author', 'author-1', 'CREATE', '{"id":"author-1","name":"Invalid"}', 'pending', 4, '2026-01-01T00:00:00.000Z');
    `);

    // HTTP 400 Bad Request error containing the word "timeout" in its server message
    const mockApi = {
      postAuthor: mock(() =>
        Promise.reject(
          new ApiHttpError(400, "Bad Request", {
            error: "Validation failed: timeout param out of range",
          }),
        ),
      ),
      fetchReadings: mock(() => Promise.resolve([])),
    } as unknown as HttpReadingApiAdapter;

    const engine = new SyncEngine(db, mockApi, mockHandler);
    await engine.pushPendingOutbox();

    const record = rawDb
      .query(
        "SELECT attempts, status FROM sync_outbox WHERE id = 'outbox-http-400'",
      )
      .get() as { attempts: number; status: string };

    // 400 Bad Request must NOT be marked transient; it must transition to 'failed' on 5th attempt
    expect(record.attempts).toBe(5);
    expect(record.status).toBe("failed");
  });
});
