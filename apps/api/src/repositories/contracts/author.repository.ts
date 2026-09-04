import type { Author } from "../../domain";

export interface ListAuthorsParams {
  limit: number;
  offset: number;
}

export interface ListAuthorsResult {
  items: Author[];
  total: number;
}

export interface AuthorRepository {
  findById(id: string): Promise<Author | null>;
  findByName(name: string): Promise<Author | null>;
  list(params: ListAuthorsParams): Promise<ListAuthorsResult>;
  create(author: Author): Promise<Author>;
}
