import type { EntityId, Reading, SupportedLocale } from "@myself/shared";

export interface ReadingRepositoryPort {
  getAll(locale: SupportedLocale): Promise<Reading[]>;
  getById(id: EntityId): Promise<Reading | null>;
  save(reading: Reading): Promise<void>;
  delete(id: EntityId): Promise<void>;
  recordLog(readingId: EntityId): Promise<string>;
  deleteLastLog(readingId: EntityId): Promise<void>;
  getLogs(readingId: EntityId): Promise<{ id: string; readAt: string }[]>;
}

export type { ReadingRepositoryPort as IReadingRepository };
