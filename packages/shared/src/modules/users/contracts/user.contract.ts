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

/**
 * The identity fields every path that writes a `user` row must validate (S3).
 *
 * The domain `User` refuses a blank name and a malformed email, so a row written
 * with either one becomes unreadable: every later read throws. Better Auth only
 * type-checks `name` as a string, so the auth hooks and the device insert reuse
 * these rules at the write boundary instead of relying on the type.
 */
export const userNameAndEmailSchema = userPropsSchema.pick({
  name: true,
  email: true,
});

export const listUsersQuerySchema = paginationQuerySchema;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
