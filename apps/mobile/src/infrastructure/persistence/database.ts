import { type SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";
import { generateUUID } from "@/utils/uuid";
import {
  SHARED_MIGRATIONS,
  DateTime,
  generateAuthorId,
  type SupportedLocale,
  type User,
  type TaskItem,
  type AuthorDto as Author,
  type MeditationReading,
  type MeditationReadingTranslation,
  type ReadingLog,
  type MeditationReadingWithAuthor,
  userNameAndEmailSchema,
} from "@myself/shared";
import { seedDatabase } from "./seed";
import { mapUserRow, type RawUserRecord } from "./mappers/user.mapper";
import { MOBILE_MIGRATIONS } from "./migrations";
import { runMigrations } from "./migrator";

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
};

/**
 * Initializes database schema with UUID keys, foreign keys, and seed data.
 */
export async function initDatabase(db: SQLiteDatabase) {
  if (Platform.OS !== "web") {
    await db.execAsync("PRAGMA journal_mode = WAL;");
  }

  await db.execAsync("PRAGMA foreign_keys = ON;");

  // 1. Apply shared domain migrations (auth, authors, readings, tasks, reflections)
  await runMigrations(db, SHARED_MIGRATIONS);

  // 2. Apply mobile local infrastructure migrations (sync_outbox)
  await runMigrations(db, MOBILE_MIGRATIONS);

  // Populate seed data
  await seedDatabase(db);
}

/**
 * Drops all user tables/views and completely re-initializes migrations and seed data.
 */
export async function resetDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = OFF;");

  const entities = await db.getAllAsync<{ name: string; type: string }>(
    "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%';",
  );

  for (const entity of entities) {
    if (entity.type === "view") {
      await db.execAsync(`DROP VIEW IF EXISTS "${entity.name}";`);
    } else if (entity.type === "table") {
      await db.execAsync(`DROP TABLE IF EXISTS "${entity.name}";`);
    }
  }

  await db.execAsync("PRAGMA foreign_keys = ON;");
  await initDatabase(db);
}

/**
 * User Operations (Better Auth `user` table, mapped into the domain entity)
 */

const USER_COLUMNS = `id, name, email, image, created_at`;

export async function getUsers(db: SQLiteDatabase): Promise<User[]> {
  const rows = await db.getAllAsync<RawUserRecord>(
    `SELECT ${USER_COLUMNS} FROM "user" ORDER BY created_at ASC`,
  );
  return rows.map(mapUserRow);
}

export async function getUserById(
  db: SQLiteDatabase,
  id: string,
): Promise<User | null> {
  const row = await db.getFirstAsync<RawUserRecord>(
    `SELECT ${USER_COLUMNS} FROM "user" WHERE id = ?`,
    [id],
  );
  return row ? mapUserRow(row) : null;
}

export async function addUser(
  db: SQLiteDatabase,
  name: string,
  email: string,
  imageUrl: string = "",
): Promise<string> {
  // Same rules the domain `User` applies, applied before the row exists: a local
  // row with a blank name or a malformed email is unreadable, because
  // `mapUserRow` builds `User` and throws. Validating here keeps the table inside
  // the domain's contract instead of persisting a row every read rejects.
  const parsed = userNameAndEmailSchema.safeParse({ name, email });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid user name or email",
    );
  }

  const id = generateUUID();
  const createdAt = DateTime.now().toMillis();
  await db.runAsync(
    'INSERT INTO "user" (id, name, email, image, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
    [id, parsed.data.name, parsed.data.email, imageUrl, createdAt, createdAt],
  );
  return id;
}

export const createUser = addUser;

/**
 * Writes the signed-in identity into the local `user` table (S13).
 *
 * Every per-user row on the device — tasks, reflections, preferences, theme progress —
 * owns a `user_id` foreign key, and the identity of a session lives on the server. The
 * admin, and any account created a moment ago, therefore has no local row, so the first
 * local write would fail the constraint. This mirror keeps the FK owner present for
 * whoever is authenticated, and it is an upsert so signing in again only refreshes the
 * profile fields: `created_at` is never rewritten, and a seeded row (the demo identity)
 * keeps its id, its content and its insertion time.
 *
 * Name and email go through the same schema as every other local write, because the
 * domain `User` that `mapUserRow` builds refuses a blank name or a malformed email.
 * `email_verified` is written as 0: verification state is the server's (`S23`), nothing on
 * the device reads the column, and claiming `1` here would be a lie.
 */
export async function upsertSessionUser(
  db: SQLiteDatabase,
  sessionUser: {
    id: string;
    name: string;
    email: string;
    /** Mirrored for faithfulness; nothing on the device reads the column (L20). */
    role?: string | null;
    imageUrl?: string | null;
  },
): Promise<void> {
  const parsed = userNameAndEmailSchema.safeParse({
    name: sessionUser.name,
    email: sessionUser.email,
  });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid user name or email",
    );
  }

  const now = DateTime.now().toMillis();
  await db.runAsync(
    `INSERT INTO "user" (id, name, email, image, email_verified, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       email = excluded.email,
       image = COALESCE(excluded.image, "user".image),
       role = COALESCE(excluded.role, "user".role),
       updated_at = excluded.updated_at`,
    [
      sessionUser.id,
      parsed.data.name,
      parsed.data.email,
      sessionUser.imageUrl ?? null,
      sessionUser.role ?? null,
      now,
      now,
    ],
  );
}

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
  const trimmedName = name.trim();
  const id = generateAuthorId(trimmedName);
  const existing = await getAuthorById(db, id);
  if (existing) {
    return existing.id;
  }

  const outboxId = generateUUID();
  const payload = JSON.stringify({ id, name: trimmedName, bio });

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT INTO authors (id, name, bio, created_at) VALUES (?, ?, ?, datetime('now'))",
      [id, trimmedName, bio],
    );
    await db.runAsync(
      `INSERT INTO sync_outbox (id, entity, entity_id, operation, payload, status, created_at)
       VALUES (?, 'author', ?, 'CREATE', ?, 'pending', strftime('%Y-%m-%dT%H:%M:%f', 'now'))`,
      [outboxId, id, payload],
    );
  });

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
