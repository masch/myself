import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const syncOutbox = sqliteTable("sync_outbox", {
  id: text("id").primaryKey(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  operation: text("operation").notNull(),
  payload: text("payload").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
});

export type SyncOutboxRecord = typeof syncOutbox.$inferSelect;
export type NewSyncOutboxRecord = typeof syncOutbox.$inferInsert;
