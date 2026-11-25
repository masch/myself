import { eq, count, asc } from "drizzle-orm";
import { user, type EntityId, type User } from "@myself/shared";
import type { DbClient } from "../client";
import { mapUserRow } from "../mappers/user.mapper";
import type {
  UserRepository,
  ListUsersParams,
  ListUsersResult,
} from "../../../ports";

export class SqliteUserRepository implements UserRepository {
  constructor(private db: DbClient) {}

  async list(params: ListUsersParams): Promise<ListUsersResult> {
    const [[countResult], rows] = await Promise.all([
      this.db.select({ count: count() }).from(user),
      this.db
        .select()
        .from(user)
        .orderBy(asc(user.id))
        .limit(params.limit)
        .offset(params.offset),
    ]);

    const items: User[] = rows.map((row) => mapUserRow(row));

    return {
      items,
      total: countResult?.count ?? 0,
    };
  }

  async findById(id: EntityId): Promise<User | null> {
    const [row] = await this.db.select().from(user).where(eq(user.id, id));

    if (!row) return null;

    return mapUserRow(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(user)
      .where(eq(user.email, email));

    if (!row) return null;

    return mapUserRow(row);
  }

  async create(domainUser: User): Promise<User> {
    const createdAt = new Date(domainUser.createdAt.toISOString());

    // The identity table is Better Auth's: a profile created here carries no
    // credential. The `account` row is inserted by the auth sign-up path.
    await this.db.insert(user).values({
      id: domainUser.id,
      name: domainUser.name,
      email: domainUser.email,
      image: domainUser.imageUrl,
      emailVerified: false,
      createdAt,
      updatedAt: createdAt,
    });

    return domainUser;
  }
}
