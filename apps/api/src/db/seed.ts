import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { SEED_AUTHORS, SEED_READINGS, generateEntityId } from "@myself/shared";
import { createDb, type DbClient } from "./client";
import type { AppConfig } from "../config";
import { authors } from "./schema/authors";
import {
  meditationReadings,
  meditationReadingTranslations,
  readingLogs,
} from "./schema/readings";

export async function seedDatabase(db: DbClient): Promise<void> {
  // 1. Seed Authors
  for (const author of SEED_AUTHORS) {
    await db
      .insert(authors)
      .values({
        id: author.id,
        name: author.name,
        bio: author.bio ?? null,
        createdAt: "2026-01-01T00:00:00.000Z",
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

    for (const readAt of reading.readDates) {
      await db
        .insert(readingLogs)
        .values({
          id: generateEntityId(),
          readingId: reading.id,
          readAt,
        })
        .onConflictDoNothing();
    }
  }
}

export async function seedFromConfig(config: AppConfig): Promise<void> {
  const { url, authToken } = config.database;
  const db = createDb({ url, authToken });
  if (url.startsWith("file:") || url === ":memory:") {
    const migrationsFolder = join(import.meta.dir, "./migrations");
    await migrate(db, { migrationsFolder });
  }
  await seedDatabase(db);
}
