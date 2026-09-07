import type { EntityId } from "../../schemas";
import type { PaginationParams, PaginatedResult } from "../../types/pagination";
import type { Author } from "../entities/author.entity";

export type ListAuthorsParams = PaginationParams;
export type ListAuthorsResult = PaginatedResult<Author>;

export interface AuthorRepositoryPort {
  findById(id: EntityId): Promise<Author | null>;
  findByName(name: string): Promise<Author | null>;
  list(params: ListAuthorsParams): Promise<ListAuthorsResult>;
  create(author: Author): Promise<Author>;
}
