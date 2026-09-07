export type OutboxOperation = "CREATE" | "UPDATE" | "DELETE";
export type OutboxStatus = "pending" | "processing" | "synced" | "failed";

export interface SyncOutboxRecord {
  id: string;
  entity: string;
  entityId: string;
  operation: OutboxOperation;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
}
