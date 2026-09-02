import { type SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";
import { generateUUID } from "@/utils/uuid";
import type {
  SupportedLocale,
  User,
  TaskItem,
  Author,
  MeditationReadingTranslation,
  ReadingLog,
  MeditationReadingWithAuthor,
} from "@myself/shared";
import { seedDatabase } from "./seed";

export { generateUUID };
export type {
  SupportedLocale,
  User,
  TaskItem,
  Author,
  MeditationReading,
  MeditationReadingTranslation,
  ReadingLog,
  MeditationReadingWithAuthor,
} from "@myself/shared";

/**
 * Initializes database schema with UUID keys, foreign keys, and seed data.
 */
export async function initDatabase(db: SQLiteDatabase) {
  if (Platform.OS !== "web") {
    await db.execAsync("PRAGMA journal_mode = WAL;");
  }

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS authors (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE,
      bio TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meditation_readings (
      id TEXT PRIMARY KEY NOT NULL,
      author_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS meditation_reading_translations (
      reading_id TEXT NOT NULL,
      locale TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      PRIMARY KEY (reading_id, locale),
      FOREIGN KEY (reading_id) REFERENCES meditation_readings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_logs (
      id TEXT PRIMARY KEY NOT NULL,
      reading_id TEXT NOT NULL,
      read_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (reading_id) REFERENCES meditation_readings(id) ON DELETE CASCADE
    );
  `);

  // Safe schema migrations for existing databases
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS meditation_reading_translations (
        reading_id TEXT NOT NULL,
        locale TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        PRIMARY KEY (reading_id, locale),
        FOREIGN KEY (reading_id) REFERENCES meditation_readings(id) ON DELETE CASCADE
      );
    `);
  } catch {
    // Table already exists
  }

  // Populate seed data
  await seedDatabase(db);
}

/**
 * User Operations
 */

export async function getUsers(db: SQLiteDatabase): Promise<User[]> {
  return await db.getAllAsync<User>(
    "SELECT * FROM users ORDER BY created_at ASC",
  );
}

export async function getUserById(
  db: SQLiteDatabase,
  id: string,
): Promise<User | null> {
  return await db.getFirstAsync<User>("SELECT * FROM users WHERE id = ?", [id]);
}

export async function addUser(
  db: SQLiteDatabase,
  name: string,
  email: string,
  avatarUrl: string = "",
): Promise<string> {
  const id = generateUUID();
  await db.runAsync(
    "INSERT INTO users (id, name, email, avatar_url, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
    [id, name, email, avatarUrl],
  );
  return id;
}

export const createUser = addUser;

/**
 * Task Operations
 */

export async function getTasksByUserId(
  db: SQLiteDatabase,
  userId: string,
): Promise<TaskItem[]> {
  return await db.getAllAsync<TaskItem>(
    "SELECT * FROM tasks WHERE user_id = ? ORDER BY is_done ASC, created_at DESC",
    [userId],
  );
}

export async function addTask(
  db: SQLiteDatabase,
  userId: string,
  title: string,
  category: string = "General",
  description: string = "",
): Promise<string> {
  const id = generateUUID();
  await db.runAsync(
    "INSERT INTO tasks (id, user_id, title, category, description, is_done, created_at) VALUES (?, ?, ?, ?, ?, 0, datetime('now'))",
    [id, userId, title, category, description],
  );
  return id;
}

export async function toggleTaskStatus(
  db: SQLiteDatabase,
  id: string,
  isDone: boolean,
): Promise<void> {
  await db.runAsync("UPDATE tasks SET is_done = ? WHERE id = ?", [
    isDone ? 1 : 0,
    id,
  ]);
}

export const toggleTask = toggleTaskStatus;

export async function deleteTask(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM tasks WHERE id = ?", [id]);
}

/**
 * Authors Operations (Independent normalized entity)
 */

export async function getAuthors(db: SQLiteDatabase): Promise<Author[]> {
  return await db.getAllAsync<Author>(
    "SELECT * FROM authors ORDER BY name ASC",
  );
}

export async function getAuthorById(
  db: SQLiteDatabase,
  id: string,
): Promise<Author | null> {
  return await db.getFirstAsync<Author>("SELECT * FROM authors WHERE id = ?", [
    id,
  ]);
}

export async function addAuthor(
  db: SQLiteDatabase,
  name: string,
  bio: string = "",
): Promise<string> {
  const id = generateUUID();
  await db.runAsync(
    "INSERT INTO authors (id, name, bio, created_at) VALUES (?, ?, ?, datetime('now'))",
    [id, name, bio],
  );
  return id;
}

export const createAuthor = addAuthor;

export async function updateAuthor(
  db: SQLiteDatabase,
  id: string,
  name: string,
  bio: string = "",
): Promise<void> {
  await db.runAsync("UPDATE authors SET name = ?, bio = ? WHERE id = ?", [
    name,
    bio,
    id,
  ]);
}

export async function deleteAuthor(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM authors WHERE id = ?", [id]);
}

/**
 * Meditation Readings Operations (Global Catalog with 1-to-N Reading Logs)
 */

export async function getAllReadings(
  db: SQLiteDatabase,
  locale: SupportedLocale = "es",
): Promise<MeditationReadingWithAuthor[]> {
  return await db.getAllAsync<MeditationReadingWithAuthor>(
    `SELECT 
       r.id,
       r.author_id,
       COALESCE(target_t.locale, fallback_t.locale, ?) AS locale,
       COALESCE(target_t.title, fallback_t.title, '') AS title,
       COALESCE(target_t.content, fallback_t.content, '') AS content,
       r.created_at,
       a.name AS author_name,
       a.bio AS author_bio,
       COUNT(l.id) AS times_read,
       MAX(l.read_at) AS last_read_at
     FROM meditation_readings r
     INNER JOIN authors a ON r.author_id = a.id
     LEFT JOIN meditation_reading_translations target_t 
       ON r.id = target_t.reading_id AND target_t.locale = ?
     LEFT JOIN meditation_reading_translations fallback_t 
       ON r.id = fallback_t.reading_id AND fallback_t.locale = 'es'
     LEFT JOIN reading_logs l ON r.id = l.reading_id
     GROUP BY r.id, r.author_id, r.created_at, a.name, a.bio, target_t.locale, target_t.title, target_t.content, fallback_t.locale, fallback_t.title, fallback_t.content
     ORDER BY (COUNT(l.id) > 0) ASC, r.created_at DESC`,
    [locale, locale],
  );
}

export async function addReading(
  db: SQLiteDatabase,
  authorId: string,
  translations: {
    es: { title: string; content: string };
    en?: { title: string; content: string };
  },
): Promise<string> {
  const id = generateUUID();
  await db.runAsync(
    "INSERT INTO meditation_readings (id, author_id, created_at) VALUES (?, ?, datetime('now'))",
    [id, authorId],
  );

  await db.runAsync(
    "INSERT INTO meditation_reading_translations (reading_id, locale, title, content) VALUES (?, 'es', ?, ?)",
    [id, translations.es.title, translations.es.content],
  );

  if (translations.en && (translations.en.title || translations.en.content)) {
    await db.runAsync(
      "INSERT INTO meditation_reading_translations (reading_id, locale, title, content) VALUES (?, 'en', ?, ?)",
      [id, translations.en.title, translations.en.content],
    );
  }

  return id;
}

export async function updateReading(
  db: SQLiteDatabase,
  id: string,
  authorId: string,
  translations: {
    es: { title: string; content: string };
    en?: { title: string; content: string };
  },
): Promise<void> {
  await db.runAsync(
    "UPDATE meditation_readings SET author_id = ? WHERE id = ?",
    [authorId, id],
  );

  await db.runAsync(
    `INSERT INTO meditation_reading_translations (reading_id, locale, title, content)
     VALUES (?, 'es', ?, ?)
     ON CONFLICT(reading_id, locale) DO UPDATE SET
       title = excluded.title,
       content = excluded.content`,
    [id, translations.es.title, translations.es.content],
  );

  if (translations.en && (translations.en.title || translations.en.content)) {
    await db.runAsync(
      `INSERT INTO meditation_reading_translations (reading_id, locale, title, content)
       VALUES (?, 'en', ?, ?)
       ON CONFLICT(reading_id, locale) DO UPDATE SET
         title = excluded.title,
         content = excluded.content`,
      [id, translations.en.title, translations.en.content],
    );
  } else {
    await db.runAsync(
      "DELETE FROM meditation_reading_translations WHERE reading_id = ? AND locale = 'en'",
      [id],
    );
  }
}

export async function getReadingTranslations(
  db: SQLiteDatabase,
  readingId: string,
): Promise<MeditationReadingTranslation[]> {
  return await db.getAllAsync<MeditationReadingTranslation>(
    "SELECT * FROM meditation_reading_translations WHERE reading_id = ?",
    [readingId],
  );
}

export async function deleteReading(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM meditation_readings WHERE id = ?", [id]);
}

/**
 * Reading Logs Operations (1-to-N History of Reads)
 */

export async function recordReadingLog(
  db: SQLiteDatabase,
  readingId: string,
): Promise<string> {
  const id = generateUUID();
  await db.runAsync(
    "INSERT INTO reading_logs (id, reading_id, read_at) VALUES (?, ?, datetime('now'))",
    [id, readingId],
  );
  return id;
}

export async function deleteLastReadingLog(
  db: SQLiteDatabase,
  readingId: string,
): Promise<void> {
  await db.runAsync(
    `DELETE FROM reading_logs 
     WHERE id = (
       SELECT id FROM reading_logs 
       WHERE reading_id = ? 
       ORDER BY read_at DESC 
       LIMIT 1
     )`,
    [readingId],
  );
}

export async function getReadingLogs(
  db: SQLiteDatabase,
  readingId: string,
): Promise<ReadingLog[]> {
  return await db.getAllAsync<ReadingLog>(
    "SELECT * FROM reading_logs WHERE reading_id = ? ORDER BY read_at DESC",
    [readingId],
  );
}
