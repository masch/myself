import { describe, expect, it } from "bun:test";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { authors } from "../schema/authors";
import {
  meditationReadings,
  meditationReadingTranslations,
  readingLogs,
} from "../schema/readings";
import { users } from "../schema/users";

describe("Database Schema Integrity Unit Tests", () => {
  it("validates that all schema foreign keys resolve to valid tables and columns", () => {
    const tables = [
      authors,
      meditationReadings,
      meditationReadingTranslations,
      readingLogs,
      users,
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

    expect(fkCount).toBe(3);
  });

  it("enforces users check constraints on empty name or email", async () => {
    const { createTestDatabase } = await import("../test-db");
    const db = await createTestDatabase({ seed: false });

    // Valid insert succeeds
    await db.insert(users).values({
      id: "00000000-0000-4000-8000-000000000001" as any,
      name: "Valid User",
      email: "valid@example.com",
      createdAt: "2026-09-04T12:00:00.000Z",
    });

    // Empty or whitespace-only name throws CHECK constraint error
    try {
      await db.insert(users).values({
        id: "00000000-0000-4000-8000-000000000002" as any,
        name: "   ",
        email: "name-empty@example.com",
        createdAt: "2026-09-04T12:00:00.000Z",
      });
      expect.unreachable("Should have failed CHECK constraint on name");
    } catch (err: any) {
      expect(err.cause?.message ?? err.message).toMatch(
        /CHECK constraint failed/i,
      );
    }

    // Empty or whitespace-only email throws CHECK constraint error
    try {
      await db.insert(users).values({
        id: "00000000-0000-4000-8000-000000000003" as any,
        name: "Valid Name",
        email: "   ",
        createdAt: "2026-09-04T12:00:00.000Z",
      });
      expect.unreachable("Should have failed CHECK constraint on email");
    } catch (err: any) {
      expect(err.cause?.message ?? err.message).toMatch(
        /CHECK constraint failed/i,
      );
    }
  });
});
