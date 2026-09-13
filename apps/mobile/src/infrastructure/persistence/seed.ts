import { generateUUID } from "@/utils/uuid";
import {
  SEED_AUTHOR_IDS,
  SEED_AUTHORS,
  SEED_READINGS,
  SEED_USERS,
  SEED_REFLECTION_CATEGORIES,
  SEED_REFLECTION_THEMES,
  SEED_THEME_COHORTS,
  SEED_REFLECTION_QUESTIONS,
  type ReadingTranslationInput,
  type AuthorDto,
  type SeedReading,
  type SeedUser,
  type SeedReflectionCategory,
  type SeedReflectionTheme,
  type SeedThemeCohort,
  type SeedReflectionQuestion,
} from "@myself/shared";
import { type SQLiteDatabase } from "expo-sqlite";

export {
  SEED_AUTHOR_IDS,
  SEED_AUTHORS,
  SEED_READINGS,
  SEED_USERS,
  SEED_REFLECTION_CATEGORIES,
  SEED_REFLECTION_THEMES,
  SEED_THEME_COHORTS,
  SEED_REFLECTION_QUESTIONS,
};
export type {
  ReadingTranslationInput,
  SeedReading,
  AuthorDto,
  SeedUser,
  SeedReflectionCategory,
  SeedReflectionTheme,
  SeedThemeCohort,
  SeedReflectionQuestion,
};

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

  // 3. Always Sync / Upsert Reflection Categories
  for (const cat of SEED_REFLECTION_CATEGORIES) {
    await db.runAsync(
      `INSERT INTO reflection_categories (id, slug, name, description, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         slug = excluded.slug,
         name = excluded.name,
         description = excluded.description`,
      [cat.id, cat.slug, cat.name, cat.description],
    );
  }

  // 4. Always Sync / Upsert Reflection Themes
  for (const theme of SEED_REFLECTION_THEMES) {
    await db.runAsync(
      `INSERT INTO reflection_themes (id, category_id, title, description, target_question_count, catch_up_window_days, edit_window_days, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         category_id = excluded.category_id,
         title = excluded.title,
         description = excluded.description,
         target_question_count = excluded.target_question_count,
         catch_up_window_days = excluded.catch_up_window_days,
         edit_window_days = excluded.edit_window_days`,
      [
        theme.id,
        theme.categoryId,
        theme.title,
        theme.description,
        theme.targetQuestionCount,
        theme.catchUpWindowDays,
        theme.editWindowDays,
      ],
    );
  }

  // 5. Always Sync / Upsert Theme Cohorts
  for (const cohort of SEED_THEME_COHORTS) {
    await db.runAsync(
      `INSERT INTO theme_cohorts (id, theme_id, name, enrollment_start_date, enrollment_end_date, program_start_date, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         theme_id = excluded.theme_id,
         name = excluded.name,
         enrollment_start_date = excluded.enrollment_start_date,
         enrollment_end_date = excluded.enrollment_end_date,
         program_start_date = excluded.program_start_date,
         status = excluded.status`,
      [
        cohort.id,
        cohort.themeId,
        cohort.name,
        cohort.enrollmentStartDate,
        cohort.enrollmentEndDate,
        cohort.programStartDate,
        cohort.status,
      ],
    );
  }

  // 6. Always Sync / Upsert Reflection Questions
  for (const q of SEED_REFLECTION_QUESTIONS) {
    await db.runAsync(
      `INSERT INTO reflection_questions (id, category_id, theme_id, prompt, periodicity, preferred_time_of_day, response_type, is_default_suggested, order_index, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         category_id = excluded.category_id,
         theme_id = excluded.theme_id,
         prompt = excluded.prompt,
         periodicity = excluded.periodicity,
         preferred_time_of_day = excluded.preferred_time_of_day,
         response_type = excluded.response_type,
         is_default_suggested = excluded.is_default_suggested,
         order_index = excluded.order_index`,
      [
        q.id,
        q.categoryId,
        q.themeId,
        q.prompt,
        q.periodicity,
        q.preferredTimeOfDay,
        q.responseType,
        q.isDefaultSuggested ? 1 : 0,
        q.orderIndex,
      ],
    );
  }
}
