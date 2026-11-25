import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { hashPassword } from "better-auth/crypto";
import {
  account,
  authors,
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  DEMO_USER_NAME,
  meditationReadings,
  meditationReadingTranslations,
  readingLogs,
  SEED_AUTHORS,
  SEED_READINGS,
  user,
} from "@myself/shared";
import {
  createDb,
  IN_MEMORY_DB,
  isLocalDatabase,
  type DbClient,
} from "./client";
import { AppConfig } from "../../config";

/**
 * Demo credential for the seeded demo account (D4). Development and staging only:
 * the seed refuses to run in production, so this never reaches a deployed surface.
 */
export const DEMO_USER_PASSWORD = "myself-demo-password";

function isDemoSeedAllowed(): boolean {
  if (typeof process === "undefined" || !process.env) {
    return false;
  }
  return process.env.ENVIRONMENT !== "production";
}

/**
 * Seeds the demo identity shared with the device seed (D4).
 *
 * Coupling worth naming: the hash is produced by Better Auth's own
 * `hashPassword` and the row mirrors what `signUpEmail` writes for the credential
 * provider (`provider_id = "credential"`, `account_id = user.id`). The sign-in path
 * verifies it with `verifyPassword`, so signing in as the demo user exercises the
 * real credential flow instead of a shortcut.
 */
async function seedDemoIdentity(db: DbClient): Promise<void> {
  const now = new Date();

  await db
    .insert(user)
    .values({
      id: DEMO_USER_ID,
      name: DEMO_USER_NAME,
      email: DEMO_USER_EMAIL,
      emailVerified: true,
      image: null,
      role: "user",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  await db
    .insert(account)
    .values({
      id: `account-${DEMO_USER_ID}`,
      accountId: DEMO_USER_ID,
      providerId: "credential",
      userId: DEMO_USER_ID,
      password: await hashPassword(DEMO_USER_PASSWORD),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

export async function seedDatabase(db: DbClient): Promise<void> {
  // 0. Demo identity (dev/staging only)
  if (isDemoSeedAllowed()) {
    await seedDemoIdentity(db);
  }

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
