import { DateTime, type EntityId, User } from "@myself/shared";

/**
 * The `user` row as `expo-sqlite` returns it: Better Auth stores timestamps as
 * integer milliseconds (`timestamp_ms`), so `created_at` arrives as a number and is
 * the only thing this mapper has to translate besides `image` -> `imageUrl`.
 */
export interface RawUserRecord {
  id: string;
  name: string;
  email: string;
  image: string | null;
  created_at: number;
}

export function mapUserRow(raw: RawUserRecord): User {
  return new User({
    id: raw.id as EntityId,
    name: raw.name,
    email: raw.email,
    imageUrl: raw.image,
    createdAt: DateTime.from(new Date(Number(raw.created_at)).toISOString()),
  });
}
