import { type SQLiteDatabase } from "expo-sqlite";
import { generateUUID } from "@/utils/uuid";

interface SeedTask {
  title: string;
  category: "Work" | "Personal" | "Shopping" | "Design" | "General";
  description: string;
  is_done: number;
}

interface SeedReading {
  authorName: string;
  content: string;
  createdAt: string;
  readDates: string[];
}

interface SeedUser {
  name: string;
  email: string;
  tasks: SeedTask[];
}

export const SEED_AUTHORS: { name: string; bio: string }[] = [
  {
    name: "Marcus Aurelius",
    bio: "Roman Emperor and Stoic philosopher, author of Meditations.",
  },
  {
    name: "Seneca",
    bio: "Stoic philosopher, statesman, and dramatist of the Roman Silver Age.",
  },
  {
    name: "Epictetus",
    bio: "Greek Stoic philosopher born into slavery in Hierapolis.",
  },
  {
    name: "Lao Tzu",
    bio: "Ancient Chinese philosopher and writer, founder of philosophical Taoism.",
  },
  {
    name: "Thich Nhat Hanh",
    bio: "Vietnamese Thiền Buddhist monk, peace activist, and author.",
  },
];

export const SEED_READINGS: SeedReading[] = [
  {
    authorName: "Marcus Aurelius",
    content:
      "You have power over your mind - not outside events. Realize this, and you will find strength.",
    createdAt: "2026-08-15 08:00:00",
    readDates: ["2026-08-20 08:30:00", "2026-08-24 07:45:00"],
  },
  {
    authorName: "Seneca",
    content:
      "We suffer more often in imagination than in reality. True happiness is to enjoy the present, without anxious dependence upon the future.",
    createdAt: "2026-08-16 09:00:00",
    readDates: [],
  },
  {
    authorName: "Thich Nhat Hanh",
    content:
      "Smile, breathe and go slowly. Breath is the bridge which connects life to consciousness, which unites your body to your thoughts.",
    createdAt: "2026-08-17 07:30:00",
    readDates: ["2026-08-25 08:00:00"],
  },
  {
    authorName: "Epictetus",
    content:
      "Don't explain your philosophy. Embody it. Wealth consists not in having great possessions, but in having few wants.",
    createdAt: "2026-08-18 10:00:00",
    readDates: [],
  },
  {
    authorName: "Lao Tzu",
    content:
      "Silence is a source of great strength. Nature does not hurry, yet everything is accomplished.",
    createdAt: "2026-08-14 06:45:00",
    readDates: [
      "2026-08-18 09:00:00",
      "2026-08-21 08:15:00",
      "2026-08-23 07:30:00",
    ],
  },
];

export const SEED_USERS: SeedUser[] = [
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
    ],
  },
];

/**
 * Seeds the database with users, tasks, authors, readings, and reading logs.
 */
export async function seedDatabase(db: SQLiteDatabase) {
  // 1. Seed Authors & Global Readings if readings are empty
  const existingReadings = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM meditation_readings LIMIT 1",
  );

  if (existingReadings.length === 0) {
    const authorIdMap: Record<string, string> = {};

    for (const author of SEED_AUTHORS) {
      const existingAuthor = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM authors WHERE name = ?",
        [author.name],
      );

      if (existingAuthor) {
        authorIdMap[author.name] = existingAuthor.id;
      } else {
        const authorId = generateUUID();
        await db.runAsync(
          "INSERT INTO authors (id, name, bio) VALUES (?, ?, ?)",
          [authorId, author.name, author.bio],
        );
        authorIdMap[author.name] = authorId;
      }
    }

    for (const reading of SEED_READINGS) {
      const readingId = generateUUID();
      const authorId = authorIdMap[reading.authorName];
      if (authorId) {
        await db.runAsync(
          "INSERT INTO meditation_readings (id, author_id, content, created_at) VALUES (?, ?, ?, ?)",
          [readingId, authorId, reading.content, reading.createdAt],
        );

        for (const readDate of reading.readDates) {
          const logId = generateUUID();
          await db.runAsync(
            "INSERT INTO reading_logs (id, reading_id, read_at) VALUES (?, ?, ?)",
            [logId, readingId, readDate],
          );
        }
      }
    }
  }

  // 2. Seed Users & Tasks if users are empty
  const existingUsers = await db.getAllAsync<{ id: string }>(
    "SELECT id FROM users LIMIT 1",
  );

  if (existingUsers.length === 0) {
    for (const user of SEED_USERS) {
      const userId = generateUUID();
      await db.runAsync(
        "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
        [userId, user.name, user.email],
      );

      for (const task of user.tasks) {
        const taskId = generateUUID();
        await db.runAsync(
          "INSERT INTO tasks (id, user_id, title, category, description, is_done) VALUES (?, ?, ?, ?, ?, ?)",
          [
            taskId,
            userId,
            task.title,
            task.category,
            task.description,
            task.is_done,
          ],
        );
      }
    }
  }
}
