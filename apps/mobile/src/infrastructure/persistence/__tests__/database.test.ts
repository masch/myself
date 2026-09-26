import { describe, expect, it, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initDatabase, resetDatabase, getUsers, createUser } from "../database";
import { type SQLiteDatabase } from "expo-sqlite";

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

describe("Database Lifecycle & Reset", () => {
  let rawDb: Database;
  let db: SQLiteDatabase;

  beforeEach(() => {
    rawDb = new Database(":memory:");
    db = createExpoSqliteAdapter(rawDb);
  });

  it("initializes database with schema and default seed data", async () => {
    await initDatabase(db);

    const users = await getUsers(db);
    expect(users.length).toBeGreaterThan(0);
    expect(users[0].name).toBe("My self");
  });

  it("resets database, erasing custom data and restoring clean seed state", async () => {
    await initDatabase(db);

    // Add a custom user
    await createUser(db, "Temporary User", "temp@example.com");
    let users = await getUsers(db);
    expect(users.some((u) => u.email === "temp@example.com")).toBe(true);

    // Reset database
    await resetDatabase(db);

    users = await getUsers(db);
    // Custom user must be removed
    expect(users.some((u) => u.email === "temp@example.com")).toBe(false);
    // Seed users must be present
    expect(users.some((u) => u.email === "myself@example.com")).toBe(true);

    // Verify migration tracking table exists and has entries
    const migrations = await db.getAllAsync<{ hash: string }>(
      'SELECT hash FROM "__drizzle_migrations"',
    );
    expect(migrations.length).toBeGreaterThan(0);
  });
});
