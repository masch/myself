import { Author, DateTime, type EntityId } from "@myself/shared";

export interface RawAuthorRecord {
  id: EntityId;
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
}
