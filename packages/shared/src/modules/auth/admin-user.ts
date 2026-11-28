import type { EntityId } from "../../primitives";

/**
 * The single admin identity the server seed creates (S20).
 *
 * `S6` gates every curated-content write behind `requireRole("admin")`, so without a
 * seeded admin nobody could write content at all. The seed is the only producer of
 * this role: the admin plugin's `/admin/set-role` endpoint is disabled
 * (`apps/api/src/auth.ts`), so no HTTP request can grant it.
 *
 * The constants live here, next to `DEMO_USER_ID`, so the seed and the tests that
 * prove the role read the same values instead of repeating literals.
 */
export const ADMIN_USER_ID = "e0000000-0000-4000-8000-0000000000ad" as EntityId;

export const ADMIN_USER_NAME = "Curated Admin";

export const ADMIN_USER_EMAIL = "admin@example.com";
