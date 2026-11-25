import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDb, IN_MEMORY_DB, type DbClient } from "./client";
import { seedDatabase } from "./seed";
import { SqliteAuthorRepository } from "./repositories/sqlite-author.repository";
import { SqliteReadingRepository } from "./repositories/sqlite-reading.repository";
import type { RepositoriesDependencies } from "../../middleware/repositories";

/**
 * Test support for the API database.
 *
 * `url` puts the test database somewhere other than `:memory:`, which is needed by any
 * suite that must also sign in through Better Auth: a `:memory:` URL gives every client
 * its own empty database, so an auth instance built from the same `AppConfig` would see
 * no rows and no admin session (S6 gates the curated writes on one). Callers that need
 * that pass a throwaway `file:` URL in the system temp directory and delete it in
 * teardown.
 */
export interface TestDatabaseOptions {
  seed?: boolean;
  url?: string;
  /**
   * Password for the seeded admin identity (S20, R1-001). The seed carries no admin
   * credential of its own, so a suite that needs an admin session passes its own value
   * here; without it the seed skips the admin and warns.
   */
  adminPassword?: string;
}

/**
 * Credential of the seeded demo identity, re-exported for the mobile-side integration
 * test, which signs in over the API it drives in-process. It comes from the seed, which
 * refuses to run in production (`ENVIRONMENT !== "production"`). The admin credential is
 * deliberately not re-exported: it is caller-supplied (`TestDatabaseOptions`).
 */
export { DEMO_USER_PASSWORD } from "./seed";

export async function createTestDatabase(
  options: TestDatabaseOptions = { seed: true },
): Promise<DbClient> {
  const db = createDb({ url: options.url ?? IN_MEMORY_DB });
  const migrationsFolder = join(
    import.meta.dir,
    "../../../../../packages/shared/src/migrations",
  );
  await migrate(db, { migrationsFolder });

  if (options.seed) {
    await seedDatabase(db, { adminPassword: options.adminPassword });
  }

  return db;
}

export async function createTestRepositories(
  options: TestDatabaseOptions = { seed: true },
): Promise<RepositoriesDependencies> {
  const db = await createTestDatabase(options);
  return {
    authorRepo: new SqliteAuthorRepository(db),
    readingRepo: new SqliteReadingRepository(db),
  };
}
