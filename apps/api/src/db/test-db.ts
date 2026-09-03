import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDb, type DbClient } from "./client";
import { seedDatabase } from "./seed";
import { DrizzleAuthorRepository } from "../repositories/drizzle/drizzle-author.repository";
import { DrizzleReadingRepository } from "../repositories/drizzle/drizzle-reading.repository";
import { DrizzleUserRepository } from "../repositories/drizzle/drizzle-user.repository";
import type { RepositoriesDependencies } from "../middleware/repositories";

export async function createTestDatabase(
  options: { seed?: boolean } = { seed: true },
): Promise<DbClient> {
  const db = createDb({ url: ":memory:" });
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
    authorRepo: new DrizzleAuthorRepository(db),
    readingRepo: new DrizzleReadingRepository(db),
    userRepo: new DrizzleUserRepository(db),
  };
}
