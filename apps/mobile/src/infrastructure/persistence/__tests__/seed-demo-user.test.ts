import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { type SQLiteDatabase } from "expo-sqlite";
import { DEMO_USER_ID, SEED_USERS } from "@myself/shared";
import { initDatabase } from "../database";

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

describe("device demo identity seed (D4)", () => {
  it("inserts the demo user with the shared fixed id and Better Auth's shape", async () => {
    const rawDb = new Database(":memory:");
    const db = createExpoSqliteAdapter(rawDb);

    await initDatabase(db);

    const demo = await db.getFirstAsync<{
      id: string;
      email_verified: number;
      created_at: number;
      updated_at: number;
    }>(
      'SELECT id, email_verified, created_at, updated_at FROM "user" WHERE id = ?',
      [DEMO_USER_ID],
    );

    expect(demo).not.toBeNull();
    expect(demo!.email_verified).toBe(1);
    expect(typeof demo!.created_at).toBe("number");
    expect(demo!.created_at).toBe(demo!.updated_at);

    const legacyTable = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
    );
    expect(legacyTable).toBeNull();
  });

  it("attributes the seeded demo tasks to the fixed demo id", async () => {
    const rawDb = new Database(":memory:");
    const db = createExpoSqliteAdapter(rawDb);

    await initDatabase(db);

    const demoSeed = SEED_USERS.find((seed) => seed.id === DEMO_USER_ID);
    expect(demoSeed).toBeDefined();

    const tasks = await db.getAllAsync<{ user_id: string }>(
      "SELECT user_id FROM tasks",
    );
    expect(tasks.length).toBe(SEED_USERS.flatMap((seed) => seed.tasks).length);
    expect(tasks.some((task) => task.user_id === DEMO_USER_ID)).toBe(true);

    const orphaned = await db.getAllAsync<{ total: number }>(
      'SELECT COUNT(*) AS total FROM tasks WHERE user_id NOT IN (SELECT id FROM "user")',
    );
    expect(orphaned[0].total).toBe(0);
  });
});
