import { z } from "zod";
import {
  entityIdSchema,
  dateTimeSchema,
  type EntityId,
} from "../../../primitives";
import { paginationQuerySchema } from "../../../pagination";
import type { SeedTask } from "../../tasks/types";

export interface UserDto {
  id: EntityId;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export type UserProfile = Pick<UserDto, "id" | "name" | "email" | "avatar_url">;

export interface SeedUser {
  id: EntityId;
  name: string;
  email: string;
  tasks: SeedTask[];
}

export const userPropsSchema = z.object({
  id: entityIdSchema,
  name: z.string().trim().min(1, "User name is required"),
  email: z.string().trim().check(z.email("Invalid email address")),
  avatarUrl: z.string().trim().check(z.url("Invalid avatar URL")).optional(),
  createdAt: dateTimeSchema,
});

export const createUserSchema = userPropsSchema.pick({
  name: true,
  email: true,
  avatarUrl: true,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const listUsersQuerySchema = paginationQuerySchema;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
