import type { EntityId, Reading, SupportedLocale } from "@myself/shared";

/**
 * Who is signed in right now, as far as the data layer is concerned (S12, S21).
 *
 * A port rather than an import: the repository takes no dependency on React or on the
 * session provider, so it stays constructible, and testable, with any answer. The signed-in
 * identity is resolved when a row is written, not when the repository is built, because a
 * repository outlives a sign-in.
 */
export interface CurrentUserPort {
  /**
   * The signed-in user's id, or `null` when nobody is signed in.
   *
   * `null` is a normal answer and never an error: device read history is a local counter,
   * so a read with no identity is stored unattributed instead of being refused.
   */
  currentUserId(): string | null;
}

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
