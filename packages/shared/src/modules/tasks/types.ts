export type TaskCategory =
  "Work" | "Personal" | "Shopping" | "Design" | "General";

export interface TaskItem {
  id: string;
  user_id: string;
  title: string;
  category: TaskCategory;
  description: string;
  is_done: number;
  created_at: string;
}

export interface SeedTask {
  title: string;
  category: TaskCategory;
  description: string;
  is_done: number;
}
