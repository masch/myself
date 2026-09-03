import { eq, sql } from "drizzle-orm";
import type { EntityId, User } from "@myself/shared";
import type { DbClient } from "../../db/client";
import { users } from "../../db/schema/users";
import type {
  UserRepository,
  ListUsersParams,
  ListUsersResult,
} from "../contracts/user.repository";

export class DrizzleUserRepository implements UserRepository {
  constructor(private db: DbClient) {}

  async list(params: ListUsersParams): Promise<ListUsersResult> {
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const rows = await this.db
      .select()
      .from(users)
      .limit(params.limit)
      .offset(params.offset);

    const items: User[] = rows.map((row) => ({
      id: row.id as EntityId,
      name: row.name,
      email: row.email,
      avatar_url: row.avatarUrl ?? undefined,
      created_at: row.createdAt,
    }));

    return {
      items,
      total: Number(countResult?.count ?? 0),
    };
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id));

    if (!row) return null;

    return {
      id: row.id as EntityId,
      name: row.name,
      email: row.email,
      avatar_url: row.avatarUrl ?? undefined,
      created_at: row.createdAt,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!row) return null;

    return {
      id: row.id as EntityId,
      name: row.name,
      email: row.email,
      avatar_url: row.avatarUrl ?? undefined,
      created_at: row.createdAt,
    };
  }

  async create(user: User): Promise<User> {
    await this.db.insert(users).values({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url ?? null,
      createdAt: user.created_at,
    });

    return user;
  }
}
