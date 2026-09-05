import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { authors } from "./authors";

export const SUPPORTED_LOCALES = ["es", "en"] as const;

export const meditationReadings = sqliteTable("meditation_readings", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
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
  (table) => [primaryKey({ columns: [table.readingId, table.locale] })],
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
