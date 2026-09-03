import { type Author, generateEntityId } from "@myself/shared";
import type {
  AuthorRepository,
  ListAuthorsParams,
  ListAuthorsResult,
} from "../repositories/contracts/author.repository";

export interface CreateAuthorInput {
  name: string;
  bio?: string;
}

export class AuthorService {
  constructor(private readonly authorRepo: AuthorRepository) {}

  async list(params: ListAuthorsParams): Promise<ListAuthorsResult> {
    return this.authorRepo.list(params);
  }

  async findById(id: string): Promise<Author | null> {
    return this.authorRepo.findById(id);
  }

  async findByName(name: string): Promise<Author | null> {
    return this.authorRepo.findByName(name);
  }

  async create(input: CreateAuthorInput): Promise<Author> {
    const id = generateEntityId();
    const createdAt = new Date().toISOString();
    const bio = input.bio?.trim() || undefined;

    const author: Author = {
      id,
      name: input.name.trim(),
      bio,
      created_at: createdAt,
    };

    return this.authorRepo.create(author);
  }
}
