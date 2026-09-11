import { check, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { SUPPORTED_LOCALES, type EntityId } from "../../primitives";
import { authors } from "../authors/schema";

export const meditationReadings = sqliteTable("meditation_readings", {
  id: text("id").$type<EntityId>().primaryKey(),
  authorId: text("author_id")
    .$type<EntityId>()
    .notNull()
    .references(() => authors.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull(),
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

export const readingLogs = sqliteTable("reading_logs", {
  id: text("id").primaryKey(),
  readingId: text("reading_id")
    .notNull()
    .references(() => meditationReadings.id, { onDelete: "cascade" }),
  readAt: text("read_at").notNull(),
});

export type MeditationReadingRecord = typeof meditationReadings.$inferSelect;
export type MeditationReadingTranslationRecord =
  typeof meditationReadingTranslations.$inferSelect;
export type ReadingLogRecord = typeof readingLogs.$inferSelect;
