import { useState, useCallback, useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";
import {
  getAllReadings,
  addReading as dbAddReading,
  updateReading as dbUpdateReading,
  deleteReading as dbDeleteReading,
  recordReadingLog as dbRecordReadingLog,
  deleteLastReadingLog as dbDeleteLastReadingLog,
  getReadingLogs as dbGetReadingLogs,
  type MeditationReadingWithAuthor,
  type ReadingLog,
} from "@/db/database";

export interface CreateReadingInput {
  authorId: string;
  content: string;
}

export interface UpdateReadingInput {
  id: string;
  authorId: string;
  content: string;
}

/**
 * Domain hook for Meditation Readings & 1-to-N Reading Logs.
 * Readings are a global application catalog of quotes and passages.
 */
export function useReadings() {
  const db = useSQLiteContext();
  const [readings, setReadings] = useState<MeditationReadingWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshReadings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getAllReadings(db);
      setReadings(data);
    } catch (error) {
      console.error("Failed to load readings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialReadings() {
      try {
        const data = await getAllReadings(db);
        if (isMounted) {
          setReadings(data);
        }
      } catch (error) {
        console.error("Failed to load readings:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialReadings();

    return () => {
      isMounted = false;
    };
  }, [db]);

  const addReading = useCallback(
    async (input: CreateReadingInput): Promise<string> => {
      const id = await dbAddReading(db, input.authorId, input.content.trim());
      await refreshReadings();
      return id;
    },
    [db, refreshReadings],
  );

  const updateReading = useCallback(
    async (input: UpdateReadingInput): Promise<void> => {
      await dbUpdateReading(db, input.id, input.authorId, input.content.trim());
      await refreshReadings();
    },
    [db, refreshReadings],
  );

  const recordRead = useCallback(
    async (readingId: string): Promise<string> => {
      const logId = await dbRecordReadingLog(db, readingId);
      await refreshReadings();
      return logId;
    },
    [db, refreshReadings],
  );

  const removeLastRead = useCallback(
    async (readingId: string): Promise<void> => {
      await dbDeleteLastReadingLog(db, readingId);
      await refreshReadings();
    },
    [db, refreshReadings],
  );

  const getLogs = useCallback(
    async (readingId: string): Promise<ReadingLog[]> => {
      return await dbGetReadingLogs(db, readingId);
    },
    [db],
  );

  const deleteReading = useCallback(
    async (id: string): Promise<void> => {
      await dbDeleteReading(db, id);
      await refreshReadings();
    },
    [db, refreshReadings],
  );

  return {
    readings,
    isLoading,
    refreshReadings,
    addReading,
    updateReading,
    recordRead,
    removeLastRead,
    getLogs,
    deleteReading,
  };
}
