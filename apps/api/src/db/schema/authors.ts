import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { EntityId } from "@myself/shared";

export const authors = sqliteTable("authors", {
  id: text("id").$type<EntityId>().primaryKey(),
  name: text("name").notNull().unique(),
  bio: text("bio"),
  createdAt: text("created_at").notNull(),
});

export type AuthorRecord = typeof authors.$inferSelect;
export type NewAuthorRecord = typeof authors.$inferInsert;
