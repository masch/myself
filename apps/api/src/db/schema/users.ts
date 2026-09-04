import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { EntityId } from "@myself/shared";

export const users = sqliteTable("users", {
  id: text("id").$type<EntityId>().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull(),
});

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
