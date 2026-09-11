import { eq, count, asc } from "drizzle-orm";
import { users, type EntityId, type User } from "@myself/shared";
import type { DbClient } from "../client";
import { UserMapper } from "../mappers/user.mapper";
import type {
  UserRepository,
  ListUsersParams,
  ListUsersResult,
} from "../../../ports";

export class SqliteUserRepository implements UserRepository {
  constructor(private db: DbClient) {}

  async list(params: ListUsersParams): Promise<ListUsersResult> {
    const [[countResult], rows] = await Promise.all([
      this.db.select({ count: count() }).from(users),
      this.db
        .select()
        .from(users)
        .orderBy(asc(users.id))
        .limit(params.limit)
        .offset(params.offset),
    ]);

    const items: User[] = rows.map((row) => UserMapper.toDomain(row));

    return {
      items,
      total: countResult?.count ?? 0,
    };
  }

  async findById(id: EntityId): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id));

    if (!row) return null;

    return UserMapper.toDomain(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!row) return null;

    return UserMapper.toDomain(row);
  }

  async create(user: User): Promise<User> {
    await this.db.insert(users).values({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt.toISOString(),
    });

    return user;
  }
}
