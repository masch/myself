import { DateTime, generateEntityId } from "@myself/shared";
import { Author } from "../domain";
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
    const createdAt = DateTime.now();
    const bio = input.bio?.trim() || undefined;

    const author = new Author({
      id,
      name: input.name.trim(),
      bio,
      createdAt,
    });

    return this.authorRepo.create(author);
  }
}
