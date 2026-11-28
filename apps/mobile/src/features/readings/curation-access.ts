import { ADMIN_ROLE } from "@myself/shared";

/**
 * Whether the current session may write curated content (S6).
 *
 * The API is the authority — every curated write is answered 401/403 without an admin
 * session — and this exists so the app does not offer an action it would be refused.
 * The parsing mirrors the server's `parseRoles`: a comma-separated field, trimmed,
 * matched by membership, so `"user,admin"` is an admin and `"Admin"` is not.
 */
export function canCurateContent(role: string | null | undefined): boolean {
  if (typeof role !== "string") return false;
  return role
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .includes(ADMIN_ROLE);
}
