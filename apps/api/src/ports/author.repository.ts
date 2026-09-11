import type {
  Author,
  EntityId,
  PaginationParams,
  PaginatedResult,
} from "@myself/shared";

export type ListAuthorsParams = PaginationParams;
export type ListAuthorsResult = PaginatedResult<Author>;

export interface AuthorRepository {
  findById(id: EntityId): Promise<Author | null>;
  findByName(name: string): Promise<Author | null>;
  list(params: ListAuthorsParams): Promise<ListAuthorsResult>;
  create(author: Author): Promise<Author>;
}

export type AuthorRepositoryPort = AuthorRepository;
