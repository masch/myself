import { eq, sql, asc } from "drizzle-orm";
import type { EntityId } from "@myself/shared";
import type { DbClient } from "../../db/client";
import { users } from "../../db/schema/users";
import { type User, UserMapper } from "../../domain";
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
      .orderBy(asc(users.id))
      .limit(params.limit)
      .offset(params.offset);

    const items: User[] = rows.map((row) => UserMapper.toDomain(row));

    return {
      items,
      total: Number(countResult?.count ?? 0),
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
