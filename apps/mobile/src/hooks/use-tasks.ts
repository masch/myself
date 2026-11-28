import { useState, useCallback, useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";
import {
  getTasksByUserId,
  addTask as dbAddTask,
  toggleTask as dbToggleTask,
  deleteTask as dbDeleteTask,
  type TaskItem,
} from "@/infrastructure/persistence/database";
import { useSession } from "@/context/session-context";

export interface CreateTaskInput {
  title: string;
  category?: string;
  description?: string;
}

/**
 * Domain hook for Task operations.
 * Automatically scopes tasks to the currently authenticated user.
 */
export function useTasks() {
  const db = useSQLiteContext();
  const { user } = useSession();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await getTasksByUserId(db, user.id);
      setTasks(data);
    } catch (error) {
      console.error("Failed to load user tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [db, user]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialTasks() {
      if (!user) {
        if (isMounted) {
          setTasks([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await getTasksByUserId(db, user.id);
        if (isMounted) {
          setTasks(data);
        }
      } catch (error) {
        console.error("Failed to load user tasks:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialTasks();

    return () => {
      isMounted = false;
    };
  }, [db, user]);

  const addTask = useCallback(
    async (input: CreateTaskInput) => {
      if (!user) {
        throw new Error("Cannot add task without an active user");
      }

      const id = await dbAddTask(
        db,
        user.id,
        input.title,
        input.category ?? "General",
        input.description ?? "",
      );
      await refreshTasks();
      return id;
    },
    [db, user, refreshTasks],
  );

  const toggleTask = useCallback(
    async (id: string, isDone: boolean) => {
      await dbToggleTask(db, id, isDone);
      await refreshTasks();
    },
    [db, refreshTasks],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await dbDeleteTask(db, id);
      await refreshTasks();
    },
    [db, refreshTasks],
  );

  return {
    user,
    tasks,
    isLoading,
    refreshTasks,
    addTask,
    toggleTask,
    deleteTask,
  };
}
