import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq, sql } from "drizzle-orm";
import { account, user } from "@myself/shared";
import { createApp } from "../../app";
import { AppConfig } from "../../config";
import {
  createDb,
  type DbClient,
} from "../../infrastructure/persistence/client";
import { seedFromConfig } from "../../infrastructure/persistence/seed";

// Throwaway value for the API's own test instance: it only ever guards a database
// created in the system temp directory and deleted when this file finishes.
const AUTH_SECRET = "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci1hdG9taWMtc2lnbi11cA==";

const REGISTERED_EMAIL = "atomic.registration@example.com";

/**
 * Registration must leave no orphan user behind (L22): Better Auth creates the `user`
 * row and then the credential `account` row, so without a real adapter transaction a
 * failed second insert keeps the user and blocks the retry — the email is taken while
 * password sign-in rejects the missing credential.
 *
 * Everything here goes through the real Hono app (POST /api/auth/sign-up/email) against
 * a throwaway libSQL file, and the failure is produced by the database itself: a trigger
 * that aborts the `account` insert, which the adapter cannot bypass or pre-validate.
 */
function createTempDatabase(): { url: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "myself-auth-atomicity-"));
  return {
    url: `file:${join(dir, "atomicity.db")}`,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function signUpRequest(email: string): Request {
  return new Request("http://localhost/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: "correct-horse-battery-staple",
      name: "Atomic Registration",
    }),
  });
}

describe("registration writes are atomic (L22)", () => {
  let app: ReturnType<typeof createApp>;
  let db: DbClient;
  let database: ReturnType<typeof createTempDatabase>;

  beforeAll(async () => {
    database = createTempDatabase();
    const config = AppConfig.from({
      ENVIRONMENT: "test",
      TURSO_DATABASE_URL: database.url,
      BETTER_AUTH_SECRET: AUTH_SECRET,
      BETTER_AUTH_URL: "http://localhost:8787",
    });
    await seedFromConfig(config);
    db = createDb({ url: database.url });
    app = createApp(config);
  });

  afterAll(() => {
    database.cleanup();
  });

  it("rolls the user row back when the credential account insert fails, so a retry succeeds", async () => {
    const usersBefore = await db.select().from(user);
    const accountsBefore = await db.select().from(account);

    await db.run(
      sql`CREATE TRIGGER reject_account_insert BEFORE INSERT ON account BEGIN SELECT RAISE(ABORT, 'forced account insert failure'); END;`,
    );

    const failed = await app.request(signUpRequest(REGISTERED_EMAIL));
    expect(failed.status).not.toBe(200);
    expect(failed.status).toBeGreaterThanOrEqual(400);

    // Row counts before and after the forced failure: an orphan user would show up
    // here as one extra `user` row with no `account` row.
    const usersAfterFailure = await db.select().from(user);
    const accountsAfterFailure = await db.select().from(account);
    expect(usersAfterFailure.length).toBe(usersBefore.length);
    expect(accountsAfterFailure.length).toBe(accountsBefore.length);
    expect(
      usersAfterFailure.filter((row) => row.email === REGISTERED_EMAIL),
    ).toHaveLength(0);

    await db.run(sql`DROP TRIGGER reject_account_insert`);

    // The retry is the behavioural proof that no orphan user kept the email.
    const retried = await app.request(signUpRequest(REGISTERED_EMAIL));
    expect(retried.status).toBe(200);

    const [created] = await db
      .select()
      .from(user)
      .where(eq(user.email, REGISTERED_EMAIL));
    expect(created).toBeDefined();
    expect(created.emailVerified).toBe(false);
    expect(created.role).toBe("user");

    const credentials = await db
      .select()
      .from(account)
      .where(eq(account.userId, created.id));
    expect(credentials).toHaveLength(1);
    expect(credentials[0].providerId).toBe("credential");
  });
});
