import { eq, count, asc } from "drizzle-orm";
import type { EntityId } from "@myself/shared";
import type { DbClient } from "../../../db/client";
import { authors } from "../../../db/schema/authors";
import { type Author } from "../../../domain";
import { AuthorMapper } from "../mappers/author.mapper";
import type {
  AuthorRepository,
  ListAuthorsParams,
  ListAuthorsResult,
} from "../../../ports";

export class SqliteAuthorRepository implements AuthorRepository {
  constructor(private readonly db: DbClient) {}

  async findByName(name: string): Promise<Author | null> {
    const [row] = await this.db
      .select()
      .from(authors)
      .where(eq(authors.name, name));

    if (!row) return null;

    return AuthorMapper.toDomain(row);
  }

  async list(params: ListAuthorsParams): Promise<ListAuthorsResult> {
    const [totalRow, rows] = await Promise.all([
      this.db.select({ count: count() }).from(authors),
      this.db
        .select()
        .from(authors)
        .orderBy(asc(authors.id))
        .limit(params.limit)
        .offset(params.offset),
    ]);

    const total = totalRow[0]?.count ?? 0;
    const items: Author[] = rows.map((r) => AuthorMapper.toDomain(r));

    return { items, total };
  }

  async findById(id: EntityId): Promise<Author | null> {
    const [row] = await this.db
      .select()
      .from(authors)
      .where(eq(authors.id, id));

    if (!row) return null;

    return AuthorMapper.toDomain(row);
  }

  async create(author: Author): Promise<Author> {
    await this.db.insert(authors).values({
      id: author.id,
      name: author.name,
      bio: author.bio ?? null,
      createdAt: author.createdAt.toISOString(),
    });

    return author;
  }
}
