import {
  DateTime,
  type EntityId,
  generateEntityId,
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

  async list(params: ListAuthorsParams): Promise<ListAuthorsResult> {
    return this.authorRepo.list(params);
  }

  async findById(id: EntityId): Promise<Author | null> {
    return this.authorRepo.findById(id);
  }

  async findByName(name: string): Promise<Author | null> {
    return this.authorRepo.findByName(name);
  }

  async create(input: CreateAuthorInput): Promise<Author> {
    const trimmedName = input.name.trim();
    const existing = await this.authorRepo.findByName(trimmedName);
    if (existing) {
      return existing;
    }

    const id = input.id ?? generateEntityId();
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
