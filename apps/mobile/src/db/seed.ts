import { generateUUID } from "@/utils/uuid";
import {
  SEED_AUTHOR_IDS,
  SEED_AUTHORS,
  SEED_READINGS,
  SEED_USERS,
  type ReadingTranslationInput,
  type AuthorDto,
  type SeedReading,
  type SeedUser,
} from "@myself/shared";
import { type SQLiteDatabase } from "expo-sqlite";

export { SEED_AUTHOR_IDS, SEED_AUTHORS, SEED_READINGS, SEED_USERS };
export type { ReadingTranslationInput, SeedReading, AuthorDto, SeedUser };

/**
 * Seeds the database with users, tasks, authors, readings, and reading logs.
 */
export async function seedDatabase(db: SQLiteDatabase) {
  // 1. Always Sync / Upsert Authors
  for (const author of SEED_AUTHORS) {
    await db.runAsync(
      `INSERT INTO authors (id, name, bio, created_at) 
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET 
         name = excluded.name, 
         bio = excluded.bio`,
      [author.id, author.name, author.bio ?? "", author.created_at],
    );
  }

  // 2. Always Sync / Upsert Meditation Readings & Translations
  for (const reading of SEED_READINGS) {
    await db.runAsync(
      `INSERT INTO meditation_readings (id, author_id, created_at) 
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET 
         author_id = excluded.author_id`,
      [reading.id, reading.author_id, reading.createdAt],
    );

    // Upsert Spanish translation (mandatory)
    await db.runAsync(
      `INSERT INTO meditation_reading_translations (reading_id, locale, title, content)
       VALUES (?, 'es', ?, ?)
       ON CONFLICT(reading_id, locale) DO UPDATE SET
         title = excluded.title,
         content = excluded.content`,
      [
        reading.id,
        reading.translations.es.title,
        reading.translations.es.content,
      ],
    );

    // Upsert English translation (optional)
    if (reading.translations.en) {
      await db.runAsync(
        `INSERT INTO meditation_reading_translations (reading_id, locale, title, content)
         VALUES (?, 'en', ?, ?)
         ON CONFLICT(reading_id, locale) DO UPDATE SET
           title = excluded.title,
           content = excluded.content`,
        [
          reading.id,
          reading.translations.en.title,
          reading.translations.en.content,
        ],
      );
    }

    for (const readDate of reading.readDates) {
      const existingLog = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM reading_logs WHERE reading_id = ? AND read_at = ? LIMIT 1",
        [reading.id, readDate],
      );
      if (!existingLog) {
        const logId = generateUUID();
        await db.runAsync(
          "INSERT INTO reading_logs (id, reading_id, read_at) VALUES (?, ?, ?)",
          [logId, reading.id, readDate],
        );
      }
    }
  }

  // 2. Seed Users & Tasks if users are empty
  const existingUsers = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM users LIMIT 1",
  );

  if (existingUsers.length === 0) {
    for (const user of SEED_USERS) {
      await db.runAsync(
        "INSERT OR IGNORE INTO users (id, name, email, created_at) VALUES (?, ?, ?, datetime('now'))",
        [user.id, user.name, user.email],
      );

      for (const task of user.tasks) {
        const taskId = generateUUID();
        await db.runAsync(
          "INSERT INTO tasks (id, user_id, title, category, description, is_done, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
          [
            taskId,
            user.id,
            task.title,
            task.category,
            task.description ?? "",
            task.is_done,
          ],
        );
      }
    }
  }
}
