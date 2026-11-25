import { DateTime, type EntityId, User } from "@myself/shared";

/**
 * The `user` row as Drizzle returns it: `created_at` is already a `Date` because the
 * auth schema declares `timestamp_ms`, and `image` is the column the domain exposes
 * as `imageUrl`.
 */
export interface RawUserRecord {
  // Better Auth types `user.id` as plain text; the identity brand is asserted here,
  // at the only boundary where the auth table shape is known.
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: Date;
}

export function mapUserRow(raw: RawUserRecord): User {
  return new User({
    id: raw.id as EntityId,
    name: raw.name,
    email: raw.email,
    imageUrl: raw.image,
    createdAt: DateTime.from(raw.createdAt.toISOString()),
  });
}
