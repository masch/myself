import { eq } from "drizzle-orm";
import type { Author } from "@myself/shared";
import type { DbClient } from "../../db/client";
import { authors } from "../../db/schema/authors";
import type {
  AuthorRepository,
  ListAuthorsParams,
  ListAuthorsResult,
} from "../contracts/author.repository";

export class DrizzleAuthorRepository implements AuthorRepository {
  constructor(private readonly db: DbClient) {}

  async findByName(name: string): Promise<Author | null> {
    const [row] = await this.db
      .select()
      .from(authors)
      .where(eq(authors.name, name));

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      bio: row.bio ?? undefined,
      created_at: row.createdAt,
    };
  }

  async list(params: ListAuthorsParams): Promise<ListAuthorsResult> {
    const [countResult, rows] = await Promise.all([
      this.db.select().from(authors),
      this.db.select().from(authors).limit(params.limit).offset(params.offset),
    ]);

    const total = countResult.length;
    const items: Author[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      bio: r.bio ?? undefined,
      created_at: r.createdAt,
    }));

    return { items, total };
  }

  async findById(id: string): Promise<Author | null> {
    const [row] = await this.db
      .select()
      .from(authors)
      .where(eq(authors.id, id));

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      bio: row.bio ?? undefined,
      created_at: row.createdAt,
    };
  }

  async create(author: Author): Promise<Author> {
    await this.db.insert(authors).values({
      id: author.id,
      name: author.name,
      bio: author.bio ?? null,
      createdAt: author.created_at,
    });

    return author;
  }
}
