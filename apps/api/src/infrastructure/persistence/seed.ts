import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { hashPassword } from "better-auth/crypto";
import {
  account,
  ADMIN_ROLE,
  ADMIN_USER_EMAIL,
  ADMIN_USER_ID,
  ADMIN_USER_NAME,
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
 *
 * This one stays committed on purpose and is not an admin: it belongs to the shared
 * demo identity (`S11`) that every checkout and every device owns, and it grants
 * nothing beyond a normal `"user"` session.
 */
export const DEMO_USER_PASSWORD = "myself-demo-password";

/**
 * Exact warning the seed prints when no admin credential is configured (R1-001).
 *
 * The admin password is deployment configuration (`ADMIN_USER_PASSWORD`), not a value
 * this repository can carry: a committed admin credential would publish a write-capable
 * curated-content account in every deploy that runs the seed.
 */
export const ADMIN_SEED_SKIPPED_WARNING =
  "[seed] Skipping the admin identity: ADMIN_USER_PASSWORD is not set. " +
  "Curated-content writes require the admin role, so set ADMIN_USER_PASSWORD " +
  "(for example in apps/api/.dev.vars) and run the seed again.";

function isDemoSeedAllowed(): boolean {
  if (typeof process === "undefined" || !process.env) {
    return false;
  }
  return process.env.ENVIRONMENT !== "production";
}

interface SeedIdentity {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** Options for `seedDatabase`; the admin credential has no default on purpose. */
export interface SeedOptions {
  /** Password for the seeded admin identity (S20). Absent means "seed no admin". */
  adminPassword?: string;
}

/**
 * Seeds one identity with a real credential (D4, S20).
 *
 * Coupling worth naming: the hash is produced by Better Auth's own
 * `hashPassword` and the row mirrors what `signUpEmail` writes for the credential
 * provider (`provider_id = "credential"`, `account_id = user.id`). The sign-in path
 * verifies it with `verifyPassword`, so signing in as either seeded identity
 * exercises the real credential flow instead of a shortcut.
 */
async function seedIdentity(
  db: DbClient,
  identity: SeedIdentity,
  password: string,
): Promise<void> {
  const now = new Date();

  await db
    .insert(user)
    .values({
      id: identity.id,
      name: identity.name,
      email: identity.email,
      emailVerified: true,
      image: null,
      role: identity.role,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  await db
    .insert(account)
    .values({
      id: `account-${identity.id}`,
      accountId: identity.id,
      providerId: "credential",
      userId: identity.id,
      password: await hashPassword(password),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

const DEMO_IDENTITY: SeedIdentity = {
  id: DEMO_USER_ID,
  name: DEMO_USER_NAME,
  email: DEMO_USER_EMAIL,
  role: "user",
};

/**
 * The only admin the app has (S20). Nothing else grants the role: the admin plugin's
 * `/admin/set-role` endpoint is disabled in `createAuth`, and its credential comes from
 * `ADMIN_USER_PASSWORD` at seed time instead of from this repository (R1-001).
 */
const ADMIN_IDENTITY: SeedIdentity = {
  id: ADMIN_USER_ID,
  name: ADMIN_USER_NAME,
  email: ADMIN_USER_EMAIL,
  role: ADMIN_ROLE,
};

export async function seedDatabase(
  db: DbClient,
  options: SeedOptions = {},
): Promise<void> {
  // 0. Seeded identities (dev/staging only): the shared demo identity (D4) and the
  //    single admin the curated-content writes need (S20). The admin only exists when
  //    the environment supplies its credential; there is no fallback, because a
  //    committed one would be a published admin password in every seeded deploy.
  if (isDemoSeedAllowed()) {
    await seedIdentity(db, DEMO_IDENTITY, DEMO_USER_PASSWORD);

    const adminPassword = options.adminPassword?.trim();
    if (adminPassword) {
      await seedIdentity(db, ADMIN_IDENTITY, adminPassword);
    } else {
      console.warn(ADMIN_SEED_SKIPPED_WARNING);
    }
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
  await seedDatabase(db, { adminPassword: config.adminUserPassword });
}

if (import.meta.main) {
  const config = AppConfig.from();
  console.log(`Seeding database at ${config.database.url}...`);
  await seedFromConfig(config);
  console.log("Database seeded successfully!");
}
