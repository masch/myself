import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDb, IN_MEMORY_DB, type DbClient } from "./client";
import { seedDatabase } from "./seed";
import { SqliteAuthorRepository } from "../adapters/persistence/sqlite/sqlite-author.repository";
import { SqliteReadingRepository } from "../adapters/persistence/sqlite/sqlite-reading.repository";
import { SqliteUserRepository } from "../adapters/persistence/sqlite/sqlite-user.repository";
import type { RepositoriesDependencies } from "../middleware/repositories";

export async function createTestDatabase(
  options: { seed?: boolean } = { seed: true },
): Promise<DbClient> {
  const db = createDb({ url: IN_MEMORY_DB });
  const migrationsFolder = join(import.meta.dir, "./migrations");
  await migrate(db, { migrationsFolder });

  if (options.seed) {
    await seedDatabase(db);
  }

  return db;
}

export async function createTestRepositories(
  options: { seed?: boolean } = { seed: true },
): Promise<RepositoriesDependencies> {
  const db = await createTestDatabase(options);
  return {
    authorRepo: new SqliteAuthorRepository(db),
    readingRepo: new SqliteReadingRepository(db),
    userRepo: new SqliteUserRepository(db),
  };
}
