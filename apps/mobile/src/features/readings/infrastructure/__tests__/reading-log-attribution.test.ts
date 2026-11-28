import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { type SQLiteDatabase } from "expo-sqlite";
import {
  SHARED_MIGRATIONS,
  generateEntityId,
  type EntityId,
} from "@myself/shared";
import {
  runMigrations,
  type MigrationBundle,
} from "@/infrastructure/persistence/migrator";
import { MOBILE_MIGRATIONS } from "@/infrastructure/persistence/migrations";
import { SqliteReadingRepository } from "../sqlite-reading.repository";
import type { CurrentUserPort } from "../../domain/reading.repository";

/**
 * Read-history attribution on the device database (S12, S21).
 *
 * Every new `reading_logs` row belongs to whoever is signed in when the read happens, and
 * the insert keeps working when nobody is: the read log is a local counter, so a missing
 * identity writes `NULL` instead of refusing the read. Rows that existed before the
 * migration that added the column stay `NULL` for ever — nothing backfills them and no read
 * invents an id for them.
 *
 * Everything here runs against a real SQLite database through the real migrations and the
 * repository's public interface; the column itself is read back with SQL because the port
 * returns log ids and timestamps, not ownership.
 */

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

/** The bundle truncated to the pre-auth 0000-0005 migrations, which have no `user_id`. */
const LEGACY_BUNDLE: MigrationBundle = {
  ...SHARED_MIGRATIONS,
  journal: {
    ...SHARED_MIGRATIONS.journal,
    entries: SHARED_MIGRATIONS.journal.entries.filter(
      (entry) => entry.idx <= 5,
    ),
  },
};

const USER_ID = "e0000000-0000-4000-8000-000000000001";

const SIGNED_IN: CurrentUserPort = { currentUserId: () => USER_ID };
const SIGNED_OUT: CurrentUserPort = { currentUserId: () => null };

function openDeviceDb(): { rawDb: Database; db: SQLiteDatabase } {
  const rawDb = new Database(":memory:");
  // Mirrors initDatabase: the device connection enforces foreign keys.
  rawDb.run("PRAGMA foreign_keys = ON;");
  return { rawDb, db: createExpoSqliteAdapter(rawDb) };
}

const AUTHOR_ID = generateEntityId();
const READING_ID = generateEntityId();

/**
 * The whole device schema, in the order `initDatabase` applies it: shared domain
 * migrations first, then the mobile-only `sync_outbox` table the outbox writes need.
 */
async function migrateDeviceDb(
  db: SQLiteDatabase,
  shared: MigrationBundle = SHARED_MIGRATIONS,
): Promise<void> {
  await runMigrations(db, shared);
  await runMigrations(db, MOBILE_MIGRATIONS);
}

/** The signed-in identity's local row plus the curated content a log points at. */
async function seedCatalog(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    INSERT INTO authors (id, name, bio, created_at)
      VALUES ('${AUTHOR_ID}', 'Marcus Aurelius', 'Stoic', '2026-01-01T00:00:00.000Z');
    INSERT INTO meditation_readings (id, author_id, created_at)
      VALUES ('${READING_ID}', '${AUTHOR_ID}', '2026-01-01T00:00:00.000Z');
    INSERT INTO meditation_reading_translations (reading_id, locale, title, content)
      VALUES ('${READING_ID}', 'es', 'On the Shortness of Life', 'It is not that we have a short time to live.');
  `);
}

async function seedSignedInUser(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`,
    [
      USER_ID,
      "Signed In",
      "signed-in@example.com",
      1770000000000,
      1770000000000,
    ],
  );
}

async function logRows(
  db: SQLiteDatabase,
): Promise<{ id: string; user_id: string | null }[]> {
  return db.getAllAsync<{ id: string; user_id: string | null }>(
    "SELECT id, user_id FROM reading_logs ORDER BY rowid",
  );
}

/**
 * Captures `console.warn` around `run`, the way the API suites capture console output.
 *
 * The warning is the only visible signal that a read was recorded unattributed, so the
 * tests read it instead of trusting the branch.
 */
async function withCapturedWarnings<T>(
  run: () => Promise<T>,
): Promise<{ result: T; warnings: string[] }> {
  const original = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    return { result: await run(), warnings };
  } finally {
    console.warn = original;
  }
}

/**
 * A device connection whose identity row disappears between the ownership probe and the
 * insert, which is the one case a probe cannot close on its own.
 */
function withConcurrentIdentityRemoval(
  db: SQLiteDatabase,
  rawDb: Database,
  userId: string,
): SQLiteDatabase {
  let removed = false;
  return {
    ...(db as unknown as Record<string, unknown>),
    async runAsync(sql: string, params: any[] = []): Promise<any> {
      if (!removed && sql.includes("INSERT INTO reading_logs")) {
        removed = true;
        rawDb.run('DELETE FROM "user" WHERE id = ?', [userId]);
      }
      return db.runAsync(sql, params);
    },
  } as unknown as SQLiteDatabase;
}

describe("reading_logs attribution (S12, S21)", () => {
  it("stores the signed-in user's id on a new log and keeps it afterwards", async () => {
    const { db } = openDeviceDb();
    await migrateDeviceDb(db);
    await seedSignedInUser(db);
    await seedCatalog(db);

    const repo = new SqliteReadingRepository(db, SIGNED_IN);

    // The healthy path stays silent: attribution happened, so there is nothing to report.
    const { result: logId, warnings } = await withCapturedWarnings(() =>
      repo.recordLog(READING_ID as EntityId),
    );
    expect(warnings).toEqual([]);

    const rows = await logRows(db);
    expect(rows).toEqual([{ id: logId, user_id: USER_ID }]);

    // The read itself is still recorded, through the public interface.
    const logs = await repo.getLogs(READING_ID as EntityId);
    expect(logs.map((log) => log.id)).toEqual([logId]);
    const readings = await repo.getAll();
    expect(readings[0]?.readDates.length).toBe(1);

    // Nothing rewrites the stored owner afterwards, not even a read while signed out.
    const signedOutRepo = new SqliteReadingRepository(db, SIGNED_OUT);
    await signedOutRepo.getAll();
    await signedOutRepo.getLogs(READING_ID as EntityId);
    expect(await logRows(db)).toEqual([{ id: logId, user_id: USER_ID }]);
  });

  it("writes NULL when nobody is signed in and still records the read", async () => {
    const { db } = openDeviceDb();
    await migrateDeviceDb(db);
    await seedCatalog(db);

    const repo = new SqliteReadingRepository(db, SIGNED_OUT);

    // Nobody signed in is the normal unattributed case, not a degraded one: no warning.
    const { result: logId, warnings } = await withCapturedWarnings(() =>
      repo.recordLog(READING_ID as EntityId),
    );
    expect(warnings).toEqual([]);

    expect(await logRows(db)).toEqual([{ id: logId, user_id: null }]);

    const logs = await repo.getLogs(READING_ID as EntityId);
    expect(logs.map((log) => log.id)).toEqual([logId]);
    const readings = await repo.getAll();
    expect(readings[0]?.readDates.length).toBe(1);
  });

  it("keeps a pre-migration row at NULL and never backfills it", async () => {
    const { db } = openDeviceDb();
    await migrateDeviceDb(db, LEGACY_BUNDLE);
    await seedCatalog(db);
    // Written by the pre-S21 code: no owner, and no column to hold one yet.
    await db.runAsync(
      "INSERT INTO reading_logs (id, reading_id, read_at) VALUES ('log-legacy', ?, '2026-01-02T08:00:00.000Z')",
      [READING_ID],
    );

    await migrateDeviceDb(db);
    await seedSignedInUser(db);

    const repo = new SqliteReadingRepository(db, SIGNED_IN);

    // Reads the migration did not write to. Both must come back with the legacy row.
    const logs = await repo.getLogs(READING_ID as EntityId);
    expect(logs.map((log) => log.id)).toEqual(["log-legacy"]);
    const readings = await repo.getAll();
    expect(readings[0]?.readDates.length).toBe(1);

    // The legacy row stays unattributed; the next read is attributed.
    const newLogId = await repo.recordLog(READING_ID as EntityId);
    expect(await logRows(db)).toEqual([
      { id: "log-legacy", user_id: null },
      { id: newLogId, user_id: USER_ID },
    ]);
  });

  it("records the read unattributed, and warns, when the signed-in id has no local row", async () => {
    // The three ways the identity mirror can leave a session without a `user` row
    // (`invalid-id`, `invalid-profile`, `email-owned-by-another-profile`). All of them reach
    // the repository as an id that owns no row, and none of them may cost the read.
    const cases = [
      { name: "a valid id with no local row", id: generateEntityId() },
      { name: "a non-UUID id (invalid-id)", id: "not-a-uuid" },
      {
        name: "an id whose address another profile owns (email-owned)",
        id: generateEntityId(),
      },
    ];

    for (const testCase of cases) {
      const { db } = openDeviceDb();
      await migrateDeviceDb(db);
      await seedCatalog(db);
      // Another profile exists, but it is not this session's identity.
      await seedSignedInUser(db);

      const repo = new SqliteReadingRepository(db, {
        currentUserId: () => testCase.id,
      });

      const { result: logId, warnings } = await withCapturedWarnings(() =>
        repo.recordLog(READING_ID as EntityId),
      );

      // The read is stored, carries no owner, and is reported rather than swallowed.
      expect(await logRows(db)).toEqual([{ id: logId, user_id: null }]);
      const logs = await repo.getLogs(READING_ID as EntityId);
      expect(logs.map((log) => log.id)).toEqual([logId]);
      const readings = await repo.getAll();
      expect(readings[0]?.readDates.length).toBe(1);

      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain("[SqliteReadingRepository]");
      expect(warnings[0]).toContain(testCase.id);
      expect(warnings[0]).toContain("user_id NULL");
    }
  });

  it("records the read unattributed when the identity row disappears mid-insert", async () => {
    const { rawDb, db } = openDeviceDb();
    await migrateDeviceDb(db);
    await seedSignedInUser(db);
    await seedCatalog(db);

    // The probe sees the row; the delete lands before the insert does.
    const racingDb = withConcurrentIdentityRemoval(db, rawDb, USER_ID);
    const repo = new SqliteReadingRepository(racingDb, SIGNED_IN);

    const { result: logId, warnings } = await withCapturedWarnings(() =>
      repo.recordLog(READING_ID as EntityId),
    );

    expect(await logRows(db)).toEqual([{ id: logId, user_id: null }]);
    const logs = await repo.getLogs(READING_ID as EntityId);
    expect(logs.map((log) => log.id)).toEqual([logId]);
    const readings = await repo.getAll();
    expect(readings[0]?.readDates.length).toBe(1);

    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("[SqliteReadingRepository]");
    expect(warnings[0]).toContain(USER_ID);
    expect(warnings[0]).toContain("user_id NULL");
  });

  it("keeps the reading_log outbox payload exactly as it was (S21, S10)", async () => {
    const { db } = openDeviceDb();
    await migrateDeviceDb(db);
    await seedSignedInUser(db);
    await seedCatalog(db);

    const repo = new SqliteReadingRepository(db, SIGNED_IN);
    const logId = await repo.recordLog(READING_ID as EntityId);

    const outbox = await db.getAllAsync<{
      entity: string;
      entity_id: string;
      operation: string;
      payload: string;
    }>(
      "SELECT entity, entity_id, operation, payload FROM sync_outbox WHERE entity = 'reading_log'",
    );

    expect(outbox.length).toBe(1);
    expect(outbox[0]?.entity_id).toBe(READING_ID);
    expect(outbox[0]?.operation).toBe("CREATE");
    const payload = JSON.parse(outbox[0]!.payload);
    expect(Object.keys(payload).sort()).toEqual(["id", "readAt", "readingId"]);
    expect(payload.id).toBe(logId);
    expect(payload.readingId).toBe(READING_ID);
  });
});
