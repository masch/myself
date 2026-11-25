import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import {
  account,
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  readingLogs,
  user,
} from "@myself/shared";
import { createTestDatabase } from "../test-db";
import { DEMO_USER_PASSWORD } from "../seed";

describe("server demo identity seed (D4)", () => {
  it("creates the demo user with the shared fixed id and a usable credential", async () => {
    const db = await createTestDatabase({ seed: true });

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
    const db = await createTestDatabase({ seed: true });

    const logs = await db.select().from(readingLogs);

    expect(logs.length).toBeGreaterThan(0);
    expect(logs.every((log) => log.userId === null)).toBe(true);
  });
});
