import { describe, expect, it } from "bun:test";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import {
  account,
  readingLogs,
  session,
  tasks,
  user,
  userQuestionPreferences,
  userReflections,
  userThemeProgress,
  verification,
} from "../../../index";

const AUTH_TABLES = [user, session, account, verification];

describe("Better Auth identity schema (S3, S4, S5, S12)", () => {
  it("exposes the four Better Auth tables with integer millisecond timestamps", () => {
    for (const table of AUTH_TABLES) {
      const config = getTableConfig(table);
      expect(config.name.length).toBeGreaterThan(0);

      for (const column of config.columns) {
        if (!column.name.endsWith("_at") && column.name !== "ban_expires") {
          continue;
        }
        expect(column.columnType).toBe("SQLiteTimestamp");
        expect(column.getSQLType()).toBe("integer");
      }
    }

    expect(getTableConfig(user).name).toBe("user");
    expect(getTableConfig(session).name).toBe("session");
    expect(getTableConfig(account).name).toBe("account");
    expect(getTableConfig(verification).name).toBe("verification");
  });

  it("keeps user.role nullable so the generated schema stays authoritative (D5)", () => {
    const role = getTableConfig(user).columns.find(
      (column) => column.name === "role",
    );

    expect(role).toBeDefined();
    expect(role?.notNull).toBe(false);
  });

  it("repoints every per-user foreign key at user.id, NOT NULL with cascade (S4)", () => {
    const perUserTables = [
      tasks,
      userQuestionPreferences,
      userThemeProgress,
      userReflections,
    ];

    for (const table of perUserTables) {
      const foreignKeys = getTableConfig(table).foreignKeys;
      const userForeignKey = foreignKeys.find((foreignKey) =>
        foreignKey
          .reference()
          .columns.some((column) => column.name === "user_id"),
      );

      expect(userForeignKey).toBeDefined();

      const reference = userForeignKey!.reference();
      expect(reference.foreignTable).toBe(user);
      expect(reference.foreignColumns.map((column) => column.name)).toEqual([
        "id",
      ]);
      expect(reference.columns.map((column) => column.notNull)).toEqual([true]);
      expect(userForeignKey!.onDelete).toBe("cascade");
    }
  });

  it("gives reading_logs a nullable user_id with an index (S12)", () => {
    const config = getTableConfig(readingLogs);
    const userId = config.columns.find((column) => column.name === "user_id");

    expect(userId).toBeDefined();
    expect(userId?.notNull).toBe(false);

    const indexedColumns = config.indexes.flatMap((tableIndex) =>
      tableIndex.config.columns.map((column) =>
        "name" in column ? column.name : undefined,
      ),
    );
    expect(indexedColumns).toContain("user_id");
  });
});
