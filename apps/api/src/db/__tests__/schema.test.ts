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
});
