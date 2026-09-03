import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const authors = sqliteTable("authors", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  bio: text("bio"),
  createdAt: text("created_at").notNull(),
});

export type AuthorRecord = typeof authors.$inferSelect;
export type NewAuthorRecord = typeof authors.$inferInsert;
