import {
  type User,
  type CreateUserInput,
  type EntityId,
  generateEntityId,
} from "@myself/shared";
import type {
  UserRepository,
  ListUsersParams,
  ListUsersResult,
} from "../repositories/contracts/user.repository";
import { UserConflictError } from "../errors";

export { UserConflictError };

export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async list(params: ListUsersParams): Promise<ListUsersResult> {
    return this.userRepo.list(params);
  }

  async findById(id: EntityId): Promise<User | null> {
    return this.userRepo.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email.trim().toLowerCase());
  }

  async create(input: CreateUserInput): Promise<User> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new UserConflictError(email);
    }

    const id = generateEntityId();
    const createdAt = new Date().toISOString();
    const avatarUrl = input.avatarUrl?.trim() || undefined;

    const user: User = {
      id,
      name: input.name.trim(),
      email,
      avatar_url: avatarUrl,
      created_at: createdAt,
    };

    try {
      return await this.userRepo.create(user);
    } catch (err: any) {
      if (
        err?.message?.includes("UNIQUE constraint failed") ||
        err?.code === "SQLITE_CONSTRAINT_UNIQUE"
      ) {
        throw new UserConflictError(email);
      }
      throw err;
    }
  }
}
