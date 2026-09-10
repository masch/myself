import type { EntityId } from "../../schemas";
import type { PaginationParams, PaginatedResult } from "../../types/pagination";
import type { User } from "../entities/user.entity";

export type ListUsersParams = PaginationParams;
export type ListUsersResult = PaginatedResult<User>;

export interface UserRepositoryPort {
  list(params: ListUsersParams): Promise<ListUsersResult>;
  findById(id: EntityId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
}
