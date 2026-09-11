import { type SQLiteDatabase } from "expo-sqlite";

export interface MigrationJournalEntry {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
}

export interface MigrationBundle {
  journal: {
    entries: MigrationJournalEntry[];
  };
  migrations: Record<string, string>;
}

/**
 * Runs Drizzle-compatible migrations asynchronously on an Expo SQLite database.
 * Encapsulates the internal migration tracking table (__drizzle_migrations).
 * Uses idempotent tag/hash matching and handles existing database baselines safely.
 */
export async function runMigrations(
  db: SQLiteDatabase,
  bundle: MigrationBundle,
): Promise<void> {
  // Ensure migration metadata tracking table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    );
  `);

  const appliedRows = await db.getAllAsync<{ hash: string }>(
    'SELECT hash FROM "__drizzle_migrations"',
  );
  const appliedHashes = new Set(appliedRows.map((r) => r.hash));

  for (const entry of bundle.journal.entries) {
    if (!appliedHashes.has(entry.tag)) {
      const sqlQuery =
        bundle.migrations[
          `m${entry.idx.toString().padStart(4, "0")}` as keyof typeof bundle.migrations
        ];
      if (sqlQuery) {
        const statements = sqlQuery.split("--> statement-breakpoint");
        for (const stmt of statements) {
          const trimmed = stmt.trim();
          if (trimmed.length > 0) {
            try {
              await db.execAsync(trimmed);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              // Handle pre-existing tables/indexes from older local databases gracefully
              if (
                !msg.includes("already exists") &&
                !msg.includes("duplicate column name")
              ) {
                throw err;
              }
            }
          }
        }
        await db.runAsync(
          'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)',
          [entry.tag, entry.when],
        );
        appliedHashes.add(entry.tag);
      }
    }
  }
}
