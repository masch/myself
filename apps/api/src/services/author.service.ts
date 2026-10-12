import {
  DateTime,
  type EntityId,
  generateAuthorId,
  Author,
} from "@myself/shared";
import type {
  AuthorRepository,
  ListAuthorsParams,
  ListAuthorsResult,
} from "../ports";

export interface CreateAuthorInput {
  id?: EntityId;
  name: string;
  bio?: string;
}

export class AuthorService {
  constructor(private readonly authorRepo: AuthorRepository) {}

  /**
   * Lists authors with pagination support.
   */
  async list(params: ListAuthorsParams): Promise<ListAuthorsResult> {
    return this.authorRepo.list(params);
  }

  /**
   * Retrieves an author by their unique entity identifier.
   */
  async findById(id: EntityId): Promise<Author | null> {
    return this.authorRepo.findById(id);
  }

  /**
   * Retrieves an author by their unique name.
   */
  async findByName(name: string): Promise<Author | null> {
    return this.authorRepo.findByName(name);
  }

  /**
   * Creates an author idempotently or returns an existing one matching the normalized name.
   * If id is omitted, derives a deterministic RFC4122 UUID v5 identifier.
   */
  async create(input: CreateAuthorInput): Promise<Author> {
    const trimmedName = input.name.trim();
    const existing = await this.authorRepo.findByName(trimmedName);
    if (existing) {
      return existing;
    }

    const id = input.id ?? generateAuthorId(trimmedName);
    const createdAt = DateTime.now();
    const bio = input.bio?.trim() || undefined;

    const author = new Author({
      id,
      name: trimmedName,
      bio,
      createdAt,
    });

    return this.authorRepo.create(author);
  }
}
