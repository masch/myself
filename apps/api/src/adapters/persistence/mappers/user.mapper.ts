import { DateTime, type EntityId, User } from "@myself/shared";

export interface RawUserRecord {
  id: EntityId;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export class UserMapper {
  static toDomain(raw: RawUserRecord): User {
    return new User({
      id: raw.id,
      name: raw.name,
      email: raw.email,
      avatarUrl: raw.avatarUrl ?? undefined,
      createdAt: DateTime.from(raw.createdAt),
    });
  }
}
