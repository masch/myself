import { useState, useCallback, useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";
import {
  getTasksByUserId,
  addTask as dbAddTask,
  toggleTask as dbToggleTask,
  deleteTask as dbDeleteTask,
  type TaskItem,
} from "@/db/database";
import { useAuth } from "@/context/auth-context";

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
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTasks = useCallback(async () => {
    if (!currentUser) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await getTasksByUserId(db, currentUser.id);
      setTasks(data);
    } catch (error) {
      console.error("Failed to load user tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [db, currentUser]);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  const addTask = useCallback(
    async (input: CreateTaskInput) => {
      if (!currentUser) {
        throw new Error("Cannot add task without an active user");
      }

      await dbAddTask(
        db,
        currentUser.id,
        input.title,
        input.category ?? "General",
        input.description ?? ""
      );
      await refreshTasks();
    },
    [db, currentUser, refreshTasks]
  );

  const toggleTask = useCallback(
    async (id: number, isDone: boolean) => {
      await dbToggleTask(db, id, isDone);
      await refreshTasks();
    },
    [db, refreshTasks]
  );

  const deleteTask = useCallback(
    async (id: number) => {
      await dbDeleteTask(db, id);
      await refreshTasks();
    },
    [db, refreshTasks]
  );

  return {
    currentUser,
    tasks,
    isLoading,
    refreshTasks,
    addTask,
    toggleTask,
    deleteTask,
  };
}
