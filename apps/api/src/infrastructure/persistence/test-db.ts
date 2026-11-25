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
}

/**
 * Credentials of the two seeded identities, re-exported for the mobile-side integration
 * test, which signs in over the API it drives in-process. Both come from the seed,
 * which refuses to run in production (`ENVIRONMENT !== "production"`).
 */
export { ADMIN_USER_PASSWORD, DEMO_USER_PASSWORD } from "./seed";

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
    await seedDatabase(db);
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
