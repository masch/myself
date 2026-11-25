/**
 * The closed set of roles this app assigns (S5).
 *
 * Assignment happens in the seed and nowhere else: the admin plugin's `/admin/set-role`
 * endpoint is disabled, so no HTTP request can grant a role. The catalogue is therefore
 * the whole vocabulary, and keeping it closed is what turns a typo into a compile error
 * or a failing test instead of a request that silently answers 403.
 *
 * `user.role` is a single nullable text column. Multiple roles would be a
 * comma-separated list, which this app does not use; the seed tests pin that no stored
 * value carries a list, because `"admin, user"` parses into a role nobody holds and
 * fails closed without saying why.
 *
 * A database CHECK was considered and deliberately not added: in a seed-only model
 * anyone able to violate it can also satisfy it, so it would guard typos, not an
 * attacker, at the price of rebuilding the identity table and its four foreign keys.
 */
export const ROLES = ["user", "admin"] as const;

export type Role = (typeof ROLES)[number];

/** What Better Auth writes for an ordinary sign-up. */
export const DEFAULT_ROLE: Role = "user";

/** The only role the app treats as admin (S5). */
export const ADMIN_ROLE: Role = "admin";

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}
