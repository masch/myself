import { describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { SHARED_MIGRATIONS } from "@myself/shared";
import { runMigrations } from "../migrator";

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

/** The bundle truncated to the pre-auth 0000-0005 migrations. */
const LEGACY_BUNDLE = {
  journal: {
    entries: SHARED_MIGRATIONS.journal.entries.filter(
      (entry) => entry.idx <= 5,
    ),
  },
  migrations: SHARED_MIGRATIONS.migrations,
};

const CLEARED_TABLES = [
  "tasks",
  "user_question_preferences",
  "user_theme_progress",
  "user_reflections",
  "user_reflection_items",
];

const AUTH_TABLES = ["user", "session", "account", "verification"];

async function tableExists(db: any, name: string): Promise<boolean> {
  const rows = (await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [name],
  )) as { name: string }[];
  return rows.length > 0;
}

async function countRows(db: any, table: string): Promise<number> {
  const rows = (await db.getAllAsync(
    `SELECT COUNT(*) AS total FROM \`${table}\``,
  )) as { total: number }[];
  return rows[0].total;
}

async function foreignKeyTargets(
  db: any,
  table: string,
): Promise<{ table: string; from: string; to: string }[]> {
  return (await db.getAllAsync(`PRAGMA foreign_key_list(\`${table}\`)`)) as {
    table: string;
    from: string;
    to: string;
  }[];
}

function openDeviceDb(): { rawDb: Database; db: any } {
  const rawDb = new Database(":memory:");
  // Mirrors initDatabase: the device connection enforces foreign keys.
  rawDb.run("PRAGMA foreign_keys = ON;");
  return { rawDb, db: createExpoSqliteAdapter(rawDb) };
}

/**
 * Seeds a pre-0006 device database: one legacy profile with a row in every table
 * the auth migration clears, two ownerless reading logs, and curated content.
 */
async function seedLegacyDeviceDatabase(db: any): Promise<void> {
  await db.execAsync(`
    INSERT INTO authors (id, name, bio, created_at)
      VALUES ('a0000000-0000-4000-8000-000000000001', 'Legacy Author', 'bio', '2026-01-01T00:00:00.000Z');
    INSERT INTO meditation_readings (id, author_id, created_at)
      VALUES ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '2026-01-01T00:00:00.000Z');
    INSERT INTO reading_logs (id, reading_id, read_at) VALUES
      ('log-1', 'b0000000-0000-4000-8000-000000000001', '2026-01-02T08:00:00.000Z'),
      ('log-2', 'b0000000-0000-4000-8000-000000000001', '2026-01-03T08:00:00.000Z');
    INSERT INTO users (id, name, email, avatar_url, created_at)
      VALUES ('e0000000-0000-4000-8000-000000000009', 'Legacy Profile', 'legacy@example.com', NULL, '2026-01-01T00:00:00.000Z');
    INSERT INTO tasks (id, user_id, title, category, description, is_done, created_at)
      VALUES ('t1', 'e0000000-0000-4000-8000-000000000009', 'Legacy task', 'Work', '', 0, '2026-01-01T00:00:00.000Z');
    INSERT INTO reflection_categories (id, slug, name, description, created_at)
      VALUES ('c0000000-0000-4000-8000-000000000001', 'legacy-category', 'Legacy', '', '2026-01-01T00:00:00.000Z');
    INSERT INTO reflection_themes (id, category_id, title, description, target_question_count, catch_up_window_days, edit_window_days, created_at)
      VALUES ('th000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Legacy theme', '', 1, 2, 3, '2026-01-01T00:00:00.000Z');
    INSERT INTO theme_cohorts (id, theme_id, name, enrollment_start_date, enrollment_end_date, program_start_date, enrollment_grace_days, status, created_at)
      VALUES ('co000000-0000-4000-8000-000000000001', 'th000000-0000-4000-8000-000000000001', 'Legacy cohort', '2026-01-01', '2026-12-31', '2026-02-01', 5, 'open', '2026-01-01T00:00:00.000Z');
    INSERT INTO reflection_questions (id, category_id, theme_id, prompt, periodicity, preferred_time_of_day, response_type, config, is_default_suggested, order_index, created_at)
      VALUES ('q0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'th000000-0000-4000-8000-000000000001', 'Legacy prompt', 'daily', NULL, 'text', NULL, 0, 0, '2026-01-01T00:00:00.000Z');
    INSERT INTO user_question_preferences (id, user_id, question_id, is_enabled, is_pinned_shortcut, updated_at)
      VALUES ('p1', 'e0000000-0000-4000-8000-000000000009', 'q0000000-0000-4000-8000-000000000001', 1, 0, '2026-01-01T00:00:00.000Z');
    INSERT INTO user_theme_progress (id, user_id, theme_id, cohort_id, cycle_run_number, current_step, answered_count, skipped_count, status, started_at, completed_at)
      VALUES ('up1', 'e0000000-0000-4000-8000-000000000009', 'th000000-0000-4000-8000-000000000001', 'co000000-0000-4000-8000-000000000001', 1, 1, 0, 0, 'in_progress', '2026-01-01T00:00:00.000Z', NULL);
    INSERT INTO user_reflections (id, user_id, question_id, theme_id, cycle_run_id, status, content, numeric_value, skip_reason, for_date, created_at, updated_at)
      VALUES ('ur1', 'e0000000-0000-4000-8000-000000000009', 'q0000000-0000-4000-8000-000000000001', 'th000000-0000-4000-8000-000000000001', 'up1', 'answered', 'legacy', NULL, NULL, '2026-01-01', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
    INSERT INTO user_reflection_items (id, reflection_id, order_index, content, created_at, updated_at)
      VALUES ('uri1', 'ur1', 0, 'legacy item', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
  `);
}

describe("migration 0006 — Better Auth identity on the device database", () => {
  it("clears the discarded local domain rows, drops users, and keeps read history (rehearsal a)", async () => {
    const { db } = openDeviceDb();

    await runMigrations(db, LEGACY_BUNDLE);
    expect(await tableExists(db, "users")).toBe(true);
    await seedLegacyDeviceDatabase(db);
    expect(await countRows(db, "tasks")).toBe(1);

    await runMigrations(db, SHARED_MIGRATIONS);

    // D1: the five local domain tables are cleared.
    for (const table of CLEARED_TABLES) {
      expect(await countRows(db, table)).toBe(0);
    }

    // The legacy users table is gone and Better Auth owns identity.
    expect(await tableExists(db, "users")).toBe(false);
    for (const table of AUTH_TABLES) {
      expect(await tableExists(db, table)).toBe(true);
    }

    // S12: read history survives, unattributed.
    const logs = (await db.getAllAsync(
      "SELECT id, user_id FROM reading_logs ORDER BY id",
    )) as { id: string; user_id: string | null }[];
    expect(logs.map((log) => log.id)).toEqual(["log-1", "log-2"]);
    expect(logs.map((log) => log.user_id)).toEqual([null, null]);

    // Curated content is untouched.
    const authors = (await db.getAllAsync("SELECT id, name FROM authors")) as {
      id: string;
      name: string;
    }[];
    expect(authors).toEqual([
      {
        id: "a0000000-0000-4000-8000-000000000001",
        name: "Legacy Author",
      },
    ]);
    expect(await countRows(db, "meditation_readings")).toBe(1);
    expect(await countRows(db, "reflection_questions")).toBe(1);

    // Every foreign key resolves against the new shape.
    const violations = (await db.getAllAsync(
      "PRAGMA foreign_key_check",
    )) as unknown[];
    expect(violations).toEqual([]);

    // The rebuilt tables target user.id, not the dropped users table.
    for (const table of CLEARED_TABLES.filter(
      (name) => name !== "user_reflection_items",
    )) {
      const targets = await foreignKeyTargets(db, table);
      const userForeignKey = targets.find(
        (target) => target.from === "user_id",
      );
      expect(
        userForeignKey && {
          table: userForeignKey.table,
          from: userForeignKey.from,
          to: userForeignKey.to,
        },
      ).toEqual({ table: "user", from: "user_id", to: "id" });
    }
  });

  it("builds the whole journal in one pass on a fresh install (rehearsal b)", async () => {
    const { db } = openDeviceDb();

    await runMigrations(db, SHARED_MIGRATIONS);

    expect(await tableExists(db, "users")).toBe(false);
    for (const table of AUTH_TABLES) {
      expect(await tableExists(db, table)).toBe(true);
    }

    for (const table of CLEARED_TABLES.filter(
      (name) => name !== "user_reflection_items",
    )) {
      const targets = await foreignKeyTargets(db, table);
      const userId = targets.find((target) => target.from === "user_id");
      expect(userId?.table).toBe("user");
      expect(userId?.to).toBe("id");
    }

    const readingLogsColumns = (await db.getAllAsync(
      "PRAGMA table_info('reading_logs')",
    )) as { name: string; notnull: number }[];
    const userIdColumn = readingLogsColumns.find(
      (column) => column.name === "user_id",
    );
    expect(userIdColumn).toBeDefined();
    expect(userIdColumn?.notnull).toBe(0);

    const violations = (await db.getAllAsync(
      "PRAGMA foreign_key_check",
    )) as unknown[];
    expect(violations).toEqual([]);
  });
});
