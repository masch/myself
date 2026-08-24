import { type SQLiteDatabase } from "expo-sqlite";
import { type User } from "./database";

interface SeedTask {
  title: string;
  category: "Work" | "Personal" | "Shopping" | "Design" | "General";
  description: string;
  is_done: number; // 0 = pending, 1 = completed
}

interface SeedUser {
  name: string;
  email: string;
  tasks: SeedTask[];
}

/**
 * Explicit seed dataset defining each user and their corresponding tasks.
 */
export const SEED_DATA: SeedUser[] = [
  {
    name: "My self",
    email: "the.masch@gmail.com",
    tasks: [
      {
        title: "Setup Expo SDK 57 project",
        category: "Work",
        description: "Configure Expo Router, Native Tabs, and @expo/ui",
        is_done: 1,
      },
      {
        title: "Implement Local-First SQLite storage",
        category: "Work",
        description: "Create schema, domain hooks, and auto-migrations",
        is_done: 1,
      },
      {
        title: "Review PR for Offline Sync",
        category: "Work",
        description: "Evaluate PowerSync vs ElectricSQL architecture",
        is_done: 0,
      },
      {
        title: "Buy specialty coffee beans",
        category: "Shopping",
        description: "Ethiopian Yirgacheffe medium roast",
        is_done: 0,
      },
    ],
  },
  {
    name: "Elena Gómez",
    email: "elena.gomez@example.com",
    tasks: [
      {
        title: "Design UI tokens in Figma",
        category: "Design",
        description: "Apple HIG dynamic colors & Material 3 palette",
        is_done: 1,
      },
      {
        title: "Conduct user testing session",
        category: "Work",
        description: "Interview 5 mobile beta testers on tabs navigation",
        is_done: 0,
      },
      {
        title: "Renew gym membership",
        category: "Personal",
        description: "Annual subscription renewal",
        is_done: 0,
      },
    ],
  },
  {
    name: "Lucas Rossi",
    email: "lucas.rossi@example.com",
    tasks: [
      {
        title: "Prepare Sprint Review demo",
        category: "Work",
        description: "Showcase multi-user database switching and SQLite CRUD",
        is_done: 0,
      },
      {
        title: "Order team lunch",
        category: "Personal",
        description: "Check dietary preferences on Slack",
        is_done: 1,
      },
    ],
  },
];

/**
 * Seeds the database with the explicit SEED_DATA if no users exist.
 */
export async function seedDatabase(db: SQLiteDatabase) {
  const existingUsers = await db.getAllAsync<User>(
    "SELECT * FROM users LIMIT 1",
  );

  if (existingUsers.length > 0) {
    return;
  }

  for (const user of SEED_DATA) {
    const userInsertResult = await db.runAsync(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      [user.name, user.email],
    );
    const userId = userInsertResult.lastInsertRowId;

    for (const task of user.tasks) {
      await db.runAsync(
        "INSERT INTO tasks (user_id, title, category, description, is_done) VALUES (?, ?, ?, ?, ?)",
        [userId, task.title, task.category, task.description, task.is_done],
      );
    }
  }
}
