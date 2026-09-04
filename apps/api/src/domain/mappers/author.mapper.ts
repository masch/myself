import { DateTime, type Author as AuthorDto } from "@myself/shared";
import { Author } from "../models/author.entity";

export interface RawAuthorRecord {
  id: string;
  name: string;
  bio?: string | null;
  createdAt: string;
}

export class AuthorMapper {
  static toDomain(raw: RawAuthorRecord): Author {
    return new Author({
      id: raw.id,
      name: raw.name,
      bio: raw.bio ?? undefined,
      createdAt: DateTime.from(raw.createdAt),
    });
  }

  static toDto(entity: Author): AuthorDto {
    return {
      id: entity.id,
      name: entity.name,
      bio: entity.bio,
      created_at: entity.createdAt.toISOString(),
    };
  }
}
