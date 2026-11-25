import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import {
  account,
  ADMIN_USER_EMAIL,
  ADMIN_USER_ID,
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  readingLogs,
  user,
} from "@myself/shared";
import { createTestDatabase } from "../test-db";
import { DEMO_USER_PASSWORD, seedFromConfig } from "../seed";
import { createDb } from "../client";
import { AppConfig } from "../../../config";

/**
 * The admin credential is a deployment secret (R1-001), so the suite supplies its own
 * value explicitly instead of importing one from the seed. Any value works: these tests
 * only prove the seed hashes exactly what the caller hands it.
 */
const TEST_ADMIN_PASSWORD = "seed-suite-admin-password";

describe("server demo identity seed (D4)", () => {
  it("creates the demo user with the shared fixed id and a usable credential", async () => {
    const db = await createTestDatabase({
      seed: true,
      adminPassword: TEST_ADMIN_PASSWORD,
    });

    const [demoUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, DEMO_USER_ID));

    expect(demoUser).toBeDefined();
    expect(demoUser.email).toBe(DEMO_USER_EMAIL);
    expect(demoUser.emailVerified).toBe(true);

    const accounts = await db
      .select()
      .from(account)
      .where(eq(account.userId, DEMO_USER_ID));

    expect(accounts).toHaveLength(1);
    expect(accounts[0].providerId).toBe("credential");
    expect(accounts[0].accountId).toBe(DEMO_USER_ID);

    const hash = accounts[0].password ?? "";
    // Better Auth's scrypt format is `<32-hex salt>:<128-hex key>`.
    expect(hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(hash.length).toBe(161);

    // The hash must be verifiable by Better Auth's own password verifier, which is
    // what the sign-in path calls.
    const { verifyPassword } = await import("better-auth/crypto");
    expect(await verifyPassword({ hash, password: DEMO_USER_PASSWORD })).toBe(
      true,
    );
    expect(
      await verifyPassword({ hash, password: `${DEMO_USER_PASSWORD}-wrong` }),
    ).toBe(false);
  });

  it("leaves the seeded read history unattributed (S12)", async () => {
    const db = await createTestDatabase({
      seed: true,
      adminPassword: TEST_ADMIN_PASSWORD,
    });

    const logs = await db.select().from(readingLogs);

    expect(logs.length).toBeGreaterThan(0);
    expect(logs.every((log) => log.userId === null)).toBe(true);
  });
});

describe("server admin identity seed (S20, R1-001)", () => {
  it("creates exactly one admin identity with a usable credential", async () => {
    const db = await createTestDatabase({
      seed: true,
      adminPassword: TEST_ADMIN_PASSWORD,
    });

    const [adminUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, ADMIN_USER_ID));

    expect(adminUser).toBeDefined();
    expect(adminUser.email).toBe(ADMIN_USER_EMAIL);
    expect(adminUser.emailVerified).toBe(true);
    expect(adminUser.role).toBe("admin");

    const accounts = await db
      .select()
      .from(account)
      .where(eq(account.userId, ADMIN_USER_ID));

    expect(accounts).toHaveLength(1);
    expect(accounts[0].providerId).toBe("credential");
    expect(accounts[0].accountId).toBe(ADMIN_USER_ID);

    // Same scrypt shape as the demo identity: only Better Auth's own hasher is used,
    // so the real sign-in path verifies it.
    const hash = accounts[0].password ?? "";
    expect(hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    const { verifyPassword } = await import("better-auth/crypto");
    expect(await verifyPassword({ hash, password: TEST_ADMIN_PASSWORD })).toBe(
      true,
    );
    // No fallback credential: a value nobody supplied is not the password.
    expect(
      await verifyPassword({
        hash,
        password: "some-default-admin-password",
      }),
    ).toBe(false);
    expect(
      await verifyPassword({ hash, password: `${TEST_ADMIN_PASSWORD}-wrong` }),
    ).toBe(false);
  });

  it("skips the admin identity and warns once when no credential is supplied", async () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(" "));
    };

    let hasAdminRow: boolean;
    try {
      const db = await createTestDatabase({ seed: true });
      const rows = await db.select().from(user);
      hasAdminRow = rows.some((row) => row.id === ADMIN_USER_ID);
    } finally {
      console.warn = originalWarn;
    }

    expect(hasAdminRow).toBe(false);
    // Exactly one operator-facing warning, naming the variable to set.
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("ADMIN_USER_PASSWORD");
    expect(warnings[0]).toContain("admin");
  });

  it("takes the credential from the ADMIN_USER_PASSWORD binding through AppConfig", async () => {
    const dir = mkdtempSync(join(tmpdir(), "myself-seed-admin-"));
    const url = `file:${join(dir, "seed.db")}`;
    try {
      // The path the CLI uses: AppConfig.from({...bindings}) -> seedFromConfig.
      const config = AppConfig.from({
        ENVIRONMENT: "test",
        TURSO_DATABASE_URL: url,
        ADMIN_USER_PASSWORD: TEST_ADMIN_PASSWORD,
      });
      await seedFromConfig(config);

      const db = createDb({ url });
      const [adminUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, ADMIN_USER_ID));
      expect(adminUser.role).toBe("admin");

      const [adminAccount] = await db
        .select()
        .from(account)
        .where(eq(account.userId, ADMIN_USER_ID));
      const { verifyPassword } = await import("better-auth/crypto");
      expect(
        await verifyPassword({
          hash: adminAccount.password ?? "",
          password: TEST_ADMIN_PASSWORD,
        }),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is the only admin, and the demo identity stays a normal user", async () => {
    const db = await createTestDatabase({
      seed: true,
      adminPassword: TEST_ADMIN_PASSWORD,
    });

    const rows = await db.select().from(user);
    const admins = rows.filter((row) =>
      parseRolesOf(row.role).includes("admin"),
    );

    expect(admins.map((row) => row.id)).toEqual([ADMIN_USER_ID]);

    const [demoUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, DEMO_USER_ID));
    expect(demoUser.role).toBe("user");
  });

  it("never seeds the admin identity in production", async () => {
    const original = process.env.ENVIRONMENT;
    process.env.ENVIRONMENT = "production";
    try {
      const db = await createTestDatabase({
        seed: true,
        adminPassword: TEST_ADMIN_PASSWORD,
      });
      const rows = await db.select().from(user);
      expect(rows.some((row) => row.id === ADMIN_USER_ID)).toBe(false);
      expect(rows.some((row) => parseRolesOf(row.role).includes("admin"))).toBe(
        false,
      );
    } finally {
      process.env.ENVIRONMENT = original;
    }
  });
});

function parseRolesOf(role: string | null | undefined): string[] {
  // The comma-separated `role` convention (S5), restated locally so this seed test
  // does not depend on the HTTP middleware; the middleware unit test pins the
  // production parser against the same table.
  if (typeof role !== "string") return [];
  return role
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
