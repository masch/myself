import { useMemo, useCallback, useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type SupportedLocale,
  type CreateReadingInput,
  type EntityId,
  Reading,
  DateTime,
} from "@myself/shared";
import { SqliteReadingRepository } from "../infrastructure/sqlite-reading.repository";
import { SyncEngine } from "@/core/sync/sync-engine";
import {
  getAllReadings,
  getReadingTranslations as dbGetReadingTranslations,
  type MeditationReadingTranslation,
  type ReadingLog,
} from "@/db/database";

export interface UpdateReadingInput {
  id: EntityId;
  authorId: EntityId;
  translations: {
    es: { title: string; content: string };
    en?: { title: string; content: string };
  };
}

/**
 * Domain Application hook for Meditation Readings.
 * Orchestrates SQLite storage (via SqliteReadingRepository with Transactional Outbox)
 * and reactive cache updates using TanStack Query.
 */
export function useReadings(locale: SupportedLocale = "es") {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  const repository = useMemo(() => new SqliteReadingRepository(db), [db]);
  const syncEngine = useMemo(() => new SyncEngine(db), [db]);

  // Initial and lifecycle sync in background
  useEffect(() => {
    syncEngine.syncAll().catch(() => {});
  }, [syncEngine]);

  // Query: Reads instantly from local SQLite via repository
  const {
    data: catalogReadings = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["readings", locale],
    queryFn: async () => {
      try {
        return await getAllReadings(db, locale);
      } catch (error: any) {
        if (error?.message?.includes("Database not found")) {
          // Web worker transient reconnect state
          return [];
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("Database not found")) {
        return failureCount < 3;
      }
      return failureCount < 2;
    },
    retryDelay: 150,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation: Record reading log (completed session read)
  const recordLogMutation = useMutation({
    mutationFn: async (readingId: string) => {
      const logId = await repository.recordLog(readingId as EntityId);
      // Trigger eager push in background explicitly
      void syncEngine.pushPendingOutbox().catch(() => {});
      return logId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["readings"] });
    },
  });

  // Mutation: Remove last reading log
  const removeLogMutation = useMutation({
    mutationFn: async (readingId: string) => {
      await repository.deleteLastLog(readingId as EntityId);
      void syncEngine.pushPendingOutbox().catch(() => {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["readings"] });
    },
  });

  // Mutation: Add reading
  const addReadingMutation = useMutation({
    mutationFn: async (input: CreateReadingInput) => {
      const reading = new Reading({
        id: crypto.randomUUID() as EntityId,
        authorId: input.authorId,
        createdAt: DateTime.now(),
        readDates: [],
        translations: {
          es: input.translations.es,
          en: input.translations.en,
        },
      });

      await repository.save(reading);
      void syncEngine.pushPendingOutbox().catch(() => {});
      return reading.id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["readings"] });
    },
  });

  // Mutation: Delete reading
  const deleteReadingMutation = useMutation({
    mutationFn: async (id: string) => {
      await repository.delete(id as EntityId);
      void syncEngine.pushPendingOutbox().catch(() => {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["readings"] });
    },
  });

  const getTranslations = useCallback(
    async (readingId: string): Promise<MeditationReadingTranslation[]> => {
      return await dbGetReadingTranslations(db, readingId);
    },
    [db],
  );

  const getLogs = useCallback(
    async (readingId: string): Promise<ReadingLog[]> => {
      const logs = await repository.getLogs(readingId as EntityId);
      return logs.map((l) => ({
        id: l.id,
        reading_id: readingId,
        read_at: l.readAt,
      }));
    },
    [repository],
  );

  return {
    readings: catalogReadings,
    isLoading,
    refreshReadings: refetch,
    addReading: (input: CreateReadingInput) =>
      addReadingMutation.mutateAsync(input),
    updateReading: async (input: UpdateReadingInput) => {
      const reading = new Reading({
        id: input.id,
        authorId: input.authorId,
        createdAt: DateTime.now(),
        readDates: [],
        translations: {
          es: input.translations.es,
          en: input.translations.en,
        },
      });
      await repository.save(reading);
      void syncEngine.pushPendingOutbox().catch(() => {});
      await queryClient.invalidateQueries({ queryKey: ["readings"] });
    },
    getTranslations,
    recordRead: (readingId: string) => recordLogMutation.mutateAsync(readingId),
    removeLastRead: (readingId: string) =>
      removeLogMutation.mutateAsync(readingId),
    getLogs,
    deleteReading: (id: string) => deleteReadingMutation.mutateAsync(id),
  };
}
