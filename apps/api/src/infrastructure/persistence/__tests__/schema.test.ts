import { describe, expect, it } from "bun:test";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import {
  account,
  authors,
  meditationReadings,
  meditationReadingTranslations,
  readingLogs,
  session,
  user,
  verification,
} from "@myself/shared";

describe("Database Schema Integrity Unit Tests", () => {
  it("validates that all schema foreign keys resolve to valid tables and columns", () => {
    const tables = [
      authors,
      meditationReadings,
      meditationReadingTranslations,
      readingLogs,
      user,
      session,
      account,
      verification,
    ];

    let fkCount = 0;
    for (const table of tables) {
      const config = getTableConfig(table);
      for (const fk of config.foreignKeys) {
        const ref = fk.reference();
        expect(ref.foreignTable).toBeDefined();
        expect(ref.foreignColumns.length).toBeGreaterThan(0);
        expect(ref.columns.length).toBeGreaterThan(0);
        fkCount++;
      }
    }

    // author -> readings, reading -> translations, reading -> logs, user -> logs,
    // user -> sessions, user -> accounts
    expect(fkCount).toBe(6);
  });

  it("keeps the auth user email unique", async () => {
    const { createTestDatabase } = await import("../test-db");
    const db = await createTestDatabase({ seed: false });

    await db.insert(user).values({
      id: "00000000-0000-4000-8000-000000000001",
      name: "Valid User",
      email: "valid@example.com",
    });

    try {
      await db.insert(user).values({
        id: "00000000-0000-4000-8000-000000000002",
        name: "Duplicate Email",
        email: "valid@example.com",
      });
      expect.unreachable("Should have failed UNIQUE constraint on email");
    } catch (err: any) {
      expect(err.cause?.message ?? err.message).toMatch(
        /UNIQUE constraint failed/i,
      );
    }
  });
});
