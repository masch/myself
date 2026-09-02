import type { SeedTask } from "./task";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export type UserProfile = Pick<User, "id" | "name" | "email" | "avatar_url">;

export interface SeedUser {
  id: string;
  name: string;
  email: string;
  tasks: SeedTask[];
}
