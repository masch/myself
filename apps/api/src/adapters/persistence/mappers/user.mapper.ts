import { DateTime, type EntityId, User, type UserDto } from "@myself/shared";

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

  static toDto(entity: User): UserDto {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      avatar_url: entity.avatarUrl,
      created_at: entity.createdAt.toISOString(),
    };
  }
}
