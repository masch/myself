import type { EntityId } from "../schemas";
import type { SeedTask } from "./task";

export interface UserDto {
  id: EntityId;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}
export type { UserDto as User };

export type UserProfile = Pick<UserDto, "id" | "name" | "email" | "avatar_url">;

export interface SeedUser {
  id: string;
  name: string;
  email: string;
  tasks: SeedTask[];
}
