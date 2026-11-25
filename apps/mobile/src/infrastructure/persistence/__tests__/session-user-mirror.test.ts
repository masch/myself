import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { type SQLiteDatabase } from "expo-sqlite";
import { DEMO_USER_ID, SEED_USER_IDS, generateEntityId } from "@myself/shared";
import {
  addTask,
  getTasksByUserId,
  getUserById,
  initDatabase,
  upsertSessionUser,
} from "../database";
import type { SessionUser } from "@/infrastructure/auth/session-service";

/**
 * The local identity must exist for whoever signs in.
 *
 * Per-user domain data stays on the device (S10) and every row of it is owned by a
 * `user.id` foreign key. A session identity — the admin, or an account created a second
 * ago — has no local row, so without this mirror the FK refuses the first task, reflection
 * or preference the user creates. The mirror writes the session identity into the local
 * `user` table with the shape the mappers already expect.
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

async function createDeviceDatabase() {
  const rawDb = new Database(":memory:");
  // Foreign keys are what make this test meaningful: without them the insert would
  // succeed for any id and the bug this fixes would be invisible.
  rawDb.run("PRAGMA foreign_keys = ON;");
  const db = createExpoSqliteAdapter(rawDb);
  await initDatabase(db);
  return { rawDb, db };
}

function newIdentity(overrides: Partial<SessionUser> = {}): SessionUser {
  const id = generateEntityId();
  return {
    id,
    name: "New Person",
    email: `person-${id}@example.com`,
    role: "user",
    ...overrides,
  };
}

describe("upsertSessionUser (S13, S21 local ownership)", () => {
  it("refuses a local write for an identity with no local row, which is the bug", async () => {
    const { db } = await createDeviceDatabase();
    const identity = newIdentity();

    const failure = await addTask(
      db,
      identity.id,
      "Write before the row exists",
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toMatch(/FOREIGN KEY/i);
  });

  it("creates the row a signed-in identity needs, so a local write succeeds afterwards", async () => {
    const { db } = await createDeviceDatabase();
    const identity = newIdentity();

    await upsertSessionUser(db, identity);

    const stored = await getUserById(db, identity.id);
    expect(stored).not.toBeNull();
    expect(stored!.name).toBe("New Person");
    expect(stored!.email).toBe(identity.email);

    const taskId = await addTask(db, identity.id, "Read before meditating");
    expect(taskId).toBeTruthy();

    const tasks = await getTasksByUserId(db, identity.id);
    expect(tasks.map((task) => task.title)).toEqual(["Read before meditating"]);
  });

  it("is idempotent and refreshes the profile fields instead of duplicating the row", async () => {
    const { db } = await createDeviceDatabase();
    const identity = newIdentity();

    await upsertSessionUser(db, identity);
    await upsertSessionUser(db, { ...identity, name: "Renamed Person" });

    const rows = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM "user" WHERE id = ?',
      [identity.id],
    );
    expect(rows.length).toBe(1);
    expect((await getUserById(db, identity.id))!.name).toBe("Renamed Person");
  });

  it("keeps the seeded profiles and their rows intact", async () => {
    const { db } = await createDeviceDatabase();

    await upsertSessionUser(db, newIdentity());

    for (const seededId of [
      SEED_USER_IDS.ELENA_GOMEZ,
      SEED_USER_IDS.LUCAS_ROSSI,
    ]) {
      expect(await getUserById(db, seededId)).not.toBeNull();
    }
    expect(await getUserById(db, DEMO_USER_ID)).not.toBeNull();
  });

  it("updates the existing demo row when the demo identity signs in", async () => {
    const { db } = await createDeviceDatabase();
    const before = await getUserById(db, DEMO_USER_ID);

    await upsertSessionUser(db, {
      id: DEMO_USER_ID,
      name: "My self",
      email: before!.email,
      role: "user",
    });

    const rows = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM "user" WHERE id = ?',
      [DEMO_USER_ID],
    );
    expect(rows.length).toBe(1);
    expect((await getUserById(db, DEMO_USER_ID))!.createdAt.toMillis()).toBe(
      before!.createdAt.toMillis(),
    );
  });

  it("rejects an identity the domain would refuse, before writing a row", async () => {
    const { db } = await createDeviceDatabase();
    const identity = newIdentity({ name: "   " });
    const before = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM "user"',
    );

    const failure = await upsertSessionUser(db, identity).catch(
      (error: unknown) => error,
    );

    expect((failure as Error).message).toBe("User name is required");
    const after = await db.getAllAsync<{ id: string }>('SELECT id FROM "user"');
    expect(after.length).toBe(before.length);
  });
});
