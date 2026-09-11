import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
  authors,
  meditationReadings,
  meditationReadingTranslations,
  readingLogs,
  SEED_AUTHORS,
  SEED_READINGS,
} from "@myself/shared";
import {
  createDb,
  IN_MEMORY_DB,
  isLocalDatabase,
  type DbClient,
} from "./client";
import { AppConfig } from "../../config";

export async function seedDatabase(db: DbClient): Promise<void> {
  // 1. Seed Authors
  for (const author of SEED_AUTHORS) {
    await db
      .insert(authors)
      .values({
        id: author.id,
        name: author.name,
        bio: author.bio ?? null,
        createdAt: author.created_at,
      })
      .onConflictDoNothing();
  }

  // 2. Seed Readings and their Translations & Logs
  for (const reading of SEED_READINGS) {
    await db
      .insert(meditationReadings)
      .values({
        id: reading.id,
        authorId: reading.author_id,
        createdAt: reading.createdAt,
      })
      .onConflictDoNothing();

    for (const [locale, trans] of Object.entries(reading.translations)) {
      if (trans && (trans.title || trans.content)) {
        await db
          .insert(meditationReadingTranslations)
          .values({
            readingId: reading.id,
            locale: locale as "es" | "en",
            title: trans.title,
            content: trans.content,
          })
          .onConflictDoNothing();
      }
    }

    // 3. Seed Reading Logs
    for (const readAt of reading.readDates) {
      await db
        .insert(readingLogs)
        .values({
          id: `log-${reading.id}-${readAt.replace(/[\s:]/g, "-")}`,
          readingId: reading.id,
          readAt,
        })
        .onConflictDoNothing();
    }
  }
}

export async function seedFromConfig(config: AppConfig): Promise<void> {
  const { url, authToken } = config.database;
  const normalizedUrl = url === "memory" ? IN_MEMORY_DB : url;
  const db = createDb({ url: normalizedUrl, authToken });
  if (isLocalDatabase(normalizedUrl)) {
    const migrationsFolder = join(
      import.meta.dir,
      "../../../../../packages/shared/src/migrations",
    );
    await migrate(db, { migrationsFolder });
  }
  await seedDatabase(db);
}

if (import.meta.main) {
  const config = AppConfig.from();
  console.log(`Seeding database at ${config.database.url}...`);
  await seedFromConfig(config);
  console.log("Database seeded successfully!");
}
