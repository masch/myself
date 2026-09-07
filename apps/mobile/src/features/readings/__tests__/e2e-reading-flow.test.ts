import { describe, expect, it, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import {
  DateTime,
  generateEntityId,
  type EntityId,
  type CreateReadingInput,
} from "@myself/shared";
import { createApp } from "../../../../../api/src/app";
import { AppConfig } from "../../../../../api/src/config";
import { createTestRepositories } from "../../../../../api/src/db/test-db";
import { SqliteReadingRepository } from "../infrastructure/sqlite-reading.repository";
import { SyncEngine } from "../../../core/sync/sync-engine";
import { HttpReadingApiAdapter } from "../infrastructure/http-reading-api.adapter";
import { Reading } from "@myself/shared";

/**
 * Adapter that connects Bun's native SQLite Database instance
 * to Expo SQLite's asynchronous interface.
 */
function createExpoSqliteAdapter(rawDb: Database) {
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
  } as any;
}

describe("E2E Vertical Integration: Mobile Front ➔ SQLite Outbox ➔ Hono API Gateway ➔ Backend DB", () => {
  let frontRawDb: Database;
  let frontExpoDb: any;
  let frontRepository: SqliteReadingRepository;
  let backendApp: ReturnType<typeof createApp>;
  let backendRepos: Awaited<ReturnType<typeof createTestRepositories>>;
  let testAuthorId: EntityId;

  beforeEach(async () => {
    // 1. Setup Backend: InMemory SQLite DB, Drizzle Repositories, and Hono OpenAPI Gateway
    const backendConfig = AppConfig.from({
      ENVIRONMENT: "test",
      TURSO_DATABASE_URL: ":memory:",
    });
    backendRepos = await createTestRepositories({ seed: true });
    backendApp = createApp(backendConfig, backendRepos);

    // Get an author from the backend database seed
    const authors = await backendRepos.authorRepo.list({ limit: 1, offset: 0 });
    expect(authors.items.length).toBeGreaterThan(0);
    testAuthorId = authors.items[0].id;

    // 2. Setup Frontend Local SQLite: Initialize tables including sync_outbox
    frontRawDb = new Database(":memory:");
    frontRawDb.run(`
      CREATE TABLE IF NOT EXISTS meditation_readings (
        id TEXT PRIMARY KEY NOT NULL,
        author_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS meditation_reading_translations (
        reading_id TEXT NOT NULL,
        locale TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        PRIMARY KEY (reading_id, locale)
      );

      CREATE TABLE IF NOT EXISTS reading_logs (
        id TEXT PRIMARY KEY NOT NULL,
        reading_id TEXT NOT NULL,
        read_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    frontExpoDb = createExpoSqliteAdapter(frontRawDb);
    frontRepository = new SqliteReadingRepository(frontExpoDb);
  });

  it("successfully persists reading locally, registers outbox, syncs via HTTP to API, and persists in backend DB", async () => {
    // Step 1: User creates and saves a meditation reading in Mobile Front
    const readingId = generateEntityId();
    const reading = new Reading({
      id: readingId,
      authorId: testAuthorId,
      createdAt: DateTime.now(),
      readDates: [],
      translations: {
        es: {
          title: "Meditación E2E sobre el Destino",
          content:
            "Acepta las cosas a las que el destino te ata con serenidad.",
        },
        en: {
          title: "E2E Meditation on Fate",
          content: "Accept the things to which fate binds you with serenity.",
        },
      },
    });

    // Frontend: Save locally with transactional outbox
    await frontRepository.save(reading);

    // Verify Mobile Local DB has the reading
    const localReading = await frontRepository.getById(readingId);
    expect(localReading).not.toBeNull();
    expect(localReading?.getTranslation("es")?.title).toBe(
      "Meditación E2E sobre el Destino",
    );

    // Verify sync_outbox has 'pending' CREATE entry
    const outboxPending = await frontExpoDb.getAllAsync(
      "SELECT * FROM sync_outbox WHERE status = 'pending'",
    );
    expect(outboxPending.length).toBe(1);
    expect(outboxPending[0].entity).toBe("reading");
    expect(outboxPending[0].operation).toBe("CREATE");

    // Step 2: Configure HttpReadingApiAdapter to directly call the real Hono Backend App
    const mockHttpApi = new HttpReadingApiAdapter();
    mockHttpApi.postReading = async (
      input: CreateReadingInput,
    ): Promise<boolean> => {
      const response = await backendApp.request("/v1/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return response.status === 201;
    };

    mockHttpApi.fetchReadings = async (): Promise<Reading[]> => {
      const response = await backendApp.request("/v1/readings?limit=100");
      if (!response.ok) return [];
      const json = (await response.json()) as any;
      const items = json.data?.items ?? [];
      return items.map(
        (i: any) =>
          new Reading({
            id: i.id,
            authorId: i.author_id,
            createdAt: DateTime.from(i.createdAt),
            readDates: (i.readDates ?? []).map((d: string) => DateTime.from(d)),
            translations: i.translations,
          }),
      );
    };

    // Step 3: Trigger SyncEngine (Network Push + Pull)
    const syncEngine = new SyncEngine(frontExpoDb, mockHttpApi);
    await syncEngine.syncAll();

    // Step 4: Verify Outbox: 'pending' items were processed and purged
    const outboxPendingAfter = await frontExpoDb.getAllAsync(
      "SELECT * FROM sync_outbox WHERE status = 'pending'",
    );
    expect(outboxPendingAfter.length).toBe(0);

    // Step 5: Verify Backend DB (Drizzle / Turso SQLite) contains the created reading
    const backendReading = await backendRepos.readingRepo.list({
      limit: 100,
      offset: 0,
      authorId: testAuthorId,
    });

    const persisted = backendReading.items.find(
      (item) =>
        item.getTranslation("es")?.title === "Meditación E2E sobre el Destino",
    );
    expect(persisted).toBeDefined();
    expect(persisted?.authorId).toBe(testAuthorId);
    expect(persisted?.getTranslation("en")?.title).toBe(
      "E2E Meditation on Fate",
    );
  });
});
