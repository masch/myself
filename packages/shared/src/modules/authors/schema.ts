import { check, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type { EntityId } from "../../primitives/entity-id";

export const authors = sqliteTable(
  "authors",
  {
    id: text("id").$type<EntityId>().primaryKey(),
    name: text("name").notNull().unique(),
    bio: text("bio"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    check("authors_name_not_empty", sql`length(trim(${table.name})) > 0`),
  ],
);

export type AuthorRecord = typeof authors.$inferSelect;
export type NewAuthorRecord = typeof authors.$inferInsert;
