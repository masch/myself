import { type SQLiteDatabase } from "expo-sqlite";
import { seedDatabase } from "./seed";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface TaskItem {
  id: number;
  user_id: number;
  title: string;
  category: string;
  description: string;
  is_done: number;
  created_at: string;
}

/**
 * Initializes database schema, foreign keys, auto-migrations, and seed data.
 */
export async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      avatar_url TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      description TEXT DEFAULT '',
      is_done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migration: Check if user_id column exists from an older database version
  try {
    const columns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(tasks)",
    );
    const hasUserId = columns.some((col) => col.name === "user_id");
    if (!hasUserId) {
      await db.execAsync(
        "ALTER TABLE tasks ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1",
      );
    }
  } catch (error) {
    console.warn("Migration check error:", error);
  }

  // Populate seed data
  await seedDatabase(db);
}

/**
 * User Operations
 */

export async function getUsers(db: SQLiteDatabase): Promise<User[]> {
  return await db.getAllAsync<User>("SELECT * FROM users ORDER BY id ASC");
}

export async function getUserById(
  db: SQLiteDatabase,
  id: number,
): Promise<User | null> {
  return await db.getFirstAsync<User>("SELECT * FROM users WHERE id = ?", [id]);
}

export async function createUser(
  db: SQLiteDatabase,
  name: string,
  email: string,
): Promise<number> {
  const result = await db.runAsync(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    [name, email],
  );
  return result.lastInsertRowId;
}

/**
 * Task Operations (Scoped by User)
 */

export async function getTasksByUserId(
  db: SQLiteDatabase,
  userId: number,
): Promise<TaskItem[]> {
  return await db.getAllAsync<TaskItem>(
    "SELECT * FROM tasks WHERE user_id = ? ORDER BY is_done ASC, id DESC",
    [userId],
  );
}

export async function addTask(
  db: SQLiteDatabase,
  userId: number,
  title: string,
  category: string = "General",
  description: string = "",
): Promise<number> {
  const result = await db.runAsync(
    "INSERT INTO tasks (user_id, title, category, description, is_done) VALUES (?, ?, ?, ?, 0)",
    [userId, title, category, description],
  );
  return result.lastInsertRowId;
}

export async function toggleTask(
  db: SQLiteDatabase,
  id: number,
  isDone: boolean,
): Promise<void> {
  await db.runAsync("UPDATE tasks SET is_done = ? WHERE id = ?", [
    isDone ? 1 : 0,
    id,
  ]);
}

export async function deleteTask(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync("DELETE FROM tasks WHERE id = ?", [id]);
}
