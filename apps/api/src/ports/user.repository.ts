import type {
  EntityId,
  PaginationParams,
  PaginatedResult,
  User,
} from "@myself/shared";

export type ListUsersParams = PaginationParams;
export type ListUsersResult = PaginatedResult<User>;

export interface UserRepository {
  findById(id: EntityId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(params: ListUsersParams): Promise<ListUsersResult>;
  create(user: User): Promise<User>;
}

export type UserRepositoryPort = UserRepository;
