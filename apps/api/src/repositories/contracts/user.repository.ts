import type { User } from "../../domain";

export interface ListUsersParams {
  limit: number;
  offset: number;
}

export interface ListUsersResult {
  items: User[];
  total: number;
}

export interface UserRepository {
  list(params: ListUsersParams): Promise<ListUsersResult>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
}
