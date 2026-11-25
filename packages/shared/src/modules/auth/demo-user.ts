import type { EntityId } from "../../primitives";

/**
 * The single demo identity shared by the server seed and the device seed (D4).
 *
 * Both seeds write this exact id, so a seeded demo account on the API and the seeded
 * device profile are the same identity. That is what removes the first-login claim
 * step (former T7): nothing has to be remapped once the user signs in.
 *
 * The value reuses the id the device seed already used for its primary profile, so
 * existing device rows kept the same owner across the auth migration.
 */
export const DEMO_USER_ID = "e0000000-0000-4000-8000-000000000001" as EntityId;

export const DEMO_USER_NAME = "My self";

export const DEMO_USER_EMAIL = "myself@example.com";
