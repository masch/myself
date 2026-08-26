import { useState, useCallback, useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";
import {
  getAuthors as dbGetAuthors,
  getAuthorById as dbGetAuthorById,
  createAuthor as dbCreateAuthor,
  updateAuthor as dbUpdateAuthor,
  deleteAuthor as dbDeleteAuthor,
  type Author,
} from "@/db/database";

export interface CreateAuthorInput {
  name: string;
  bio?: string;
}

export interface UpdateAuthorInput {
  id: string;
  name: string;
  bio?: string;
}

/**
 * Domain hook for Author operations.
 * Encapsulates SQLite queries for Authors ABM.
 */
export function useAuthors() {
  const db = useSQLiteContext();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuthors = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await dbGetAuthors(db);
      setAuthors(data);
    } catch (error) {
      console.error("Failed to load authors:", error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialAuthors() {
      try {
        const data = await dbGetAuthors(db);
        if (isMounted) {
          setAuthors(data);
        }
      } catch (error) {
        console.error("Failed to load authors:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialAuthors();

    return () => {
      isMounted = false;
    };
  }, [db]);

  const addAuthor = useCallback(
    async (input: CreateAuthorInput): Promise<string> => {
      const id = await dbCreateAuthor(
        db,
        input.name.trim(),
        input.bio?.trim() ?? "",
      );
      await refreshAuthors();
      return id;
    },
    [db, refreshAuthors],
  );

  const updateAuthor = useCallback(
    async (input: UpdateAuthorInput): Promise<void> => {
      await dbUpdateAuthor(
        db,
        input.id,
        input.name.trim(),
        input.bio?.trim() ?? "",
      );
      await refreshAuthors();
    },
    [db, refreshAuthors],
  );

  const deleteAuthor = useCallback(
    async (id: string): Promise<void> => {
      await dbDeleteAuthor(db, id);
      await refreshAuthors();
    },
    [db, refreshAuthors],
  );

  const getAuthor = useCallback(
    async (id: string): Promise<Author | null> => {
      return await dbGetAuthorById(db, id);
    },
    [db],
  );

  return {
    authors,
    isLoading,
    refreshAuthors,
    addAuthor,
    updateAuthor,
    deleteAuthor,
    getAuthor,
  };
}
