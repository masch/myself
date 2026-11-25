import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { SUPPORTED_LOCALES, type EntityId } from "../../primitives";
import { authors } from "../authors/schema";
import { user } from "../auth/schema";

export const meditationReadings = sqliteTable("meditation_readings", {
  id: text("id").$type<EntityId>().primaryKey(),
  authorId: text("author_id")
    .$type<EntityId>()
    .notNull()
    .references(() => authors.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull(),
  version: integer("version").notNull().default(1),
});

export const meditationReadingTranslations = sqliteTable(
  "meditation_reading_translations",
  {
    readingId: text("reading_id")
      .notNull()
      .references(() => meditationReadings.id, { onDelete: "cascade" }),
    locale: text("locale", { enum: SUPPORTED_LOCALES }).notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.readingId, table.locale] }),
    check("locale_valid", sql`${table.locale} IN ('es', 'en')`),
  ],
);

/**
 * Read history attributable to a user (S12). `user_id` is nullable because the
 * column arrives on databases that already hold ownerless history, and the read
 * history stays shared content rather than user-owned data: deleting the identity
 * detaches the log instead of deleting it.
 */
export const readingLogs = sqliteTable(
  "reading_logs",
  {
    id: text("id").primaryKey(),
    readingId: text("reading_id")
      .notNull()
      .references(() => meditationReadings.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    readAt: text("read_at").notNull(),
  },
  (table) => [index("reading_logs_user_idx").on(table.userId)],
);

export type MeditationReadingRecord = typeof meditationReadings.$inferSelect;
export type MeditationReadingTranslationRecord =
  typeof meditationReadingTranslations.$inferSelect;
export type ReadingLogRecord = typeof readingLogs.$inferSelect;
