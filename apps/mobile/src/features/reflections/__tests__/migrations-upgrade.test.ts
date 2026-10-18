import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { SHARED_MIGRATIONS } from "@myself/shared";
import { runMigrations } from "../../../infrastructure/persistence/migrator";

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

async function tableExists(db: any, name: string): Promise<boolean> {
  const rows = (await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [name],
  )) as { name: string }[];
  return rows.length > 0;
}

describe("incremental reflections migrations", () => {
  it("applies 0005 on a database already migrated to 0004 and is idempotent", async () => {
    const rawDb = new Database(":memory:");
    const db = createExpoSqliteAdapter(rawDb);

    // Step 1: apply the bundle truncated to entries 0000-0004, simulating an
    // existing install. The truncated bundle is built from SHARED_MIGRATIONS so
    // the production bundle stays untouched.
    const upTo0004 = {
      journal: {
        entries: SHARED_MIGRATIONS.journal.entries.filter(
          (entry) => entry.idx <= 4,
        ),
      },
      migrations: SHARED_MIGRATIONS.migrations,
    };
    await runMigrations(db, upTo0004);
    expect(await tableExists(db, "program_step_resources")).toBe(false);

    // Step 2: apply the full bundle; 0005 adds the resources table.
    await runMigrations(db, SHARED_MIGRATIONS);
    expect(await tableExists(db, "program_step_resources")).toBe(true);

    // The new table is usable: insert a resource and read it back.
    await db.runAsync(
      `INSERT INTO program_step_resources (id, step_content_id, kind, label, url, order_index, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "f-incremental-test",
        "d-incremental-test",
        "audio",
        "Audio incremental",
        "https://example.com/audio",
        1,
        "2026-01-01T00:00:00.000Z",
      ],
    );
    const rows = (await db.getAllAsync(
      "SELECT id, label, order_index FROM program_step_resources WHERE id = ?",
      ["f-incremental-test"],
    )) as { id: string; label: string; order_index: number }[];
    expect(rows).toEqual([
      { id: "f-incremental-test", label: "Audio incremental", order_index: 1 },
    ]);

    // Re-running the full bundle is a no-op: the row survives untouched.
    await runMigrations(db, SHARED_MIGRATIONS);
    const rowsAfter = (await db.getAllAsync(
      "SELECT id FROM program_step_resources",
    )) as { id: string }[];
    expect(rowsAfter).toEqual([{ id: "f-incremental-test" }]);
  });
});
