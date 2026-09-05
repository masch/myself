import { check, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type { EntityId } from "@myself/shared";

export const users = sqliteTable(
  "users",
  {
    id: text("id").$type<EntityId>().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    avatarUrl: text("avatar_url"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    check("users_name_not_empty", sql`length(trim(${table.name})) > 0`),
    check("users_email_not_empty", sql`length(trim(${table.email})) > 0`),
  ],
);

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
