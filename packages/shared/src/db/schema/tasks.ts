import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import type { TaskCategory } from "../../types/task";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category").$type<TaskCategory>().notNull(),
  description: text("description").default(""),
  isDone: integer("is_done").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export type TaskRecord = typeof tasks.$inferSelect;
export type NewTaskRecord = typeof tasks.$inferInsert;
