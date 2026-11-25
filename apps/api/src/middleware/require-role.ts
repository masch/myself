import { createMiddleware } from "hono/factory";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";
import type { Auth } from "../auth";
import { ForbiddenError, UnauthorizedError } from "../errors";

/**
 * The role a session carries, as read from the session user (S5).
 *
 * `role` is nullable in the auth schema and is a comma-separated convention rather
 * than a single value, so it is carried here unparsed and decided by `hasRole`.
 */
export interface SessionRole {
  role: string | null;
}

/**
 * Resolves the session behind a request's headers.
 *
 * `null` means "no session", which is a 401; a resolved session with no usable role
 * is a 403. Keeping that difference here is what lets the middleware distinguish the
 * two codes without re-reading the request.
 */
export type SessionRoleResolver = (
  headers: Headers,
) => Promise<SessionRole | null>;

/**
 * The production resolver: Better Auth's own session lookup (S5).
 *
 * The role is read from the session, never from the request body, query or a header.
 * Better Auth resolves the session from the `Authorization: Bearer` header (native)
 * or the session cookie (web), so both transports are covered by one lookup.
 */
export function createSessionRoleResolver(auth: Auth): SessionRoleResolver {
  return async (headers) => {
    const session = await auth.api.getSession({ headers });
    if (!session) {
      return null;
    }
    return { role: session.user.role ?? null };
  };
}

/**
 * Splits the comma-separated `role` convention Better Auth stores (S5).
 *
 * `user.role` is nullable and, when it carries several roles, they are comma
 * separated. Every entry is trimmed, so `"admin, user"` (with the space the library
 * itself produces from an array) is the same as `"admin,user"`. An empty, blank or
 * missing value has no roles at all, which is what makes NULL non-admin.
 *
 * The comparison is case-sensitive on purpose: `"Admin"` is not a role this app
 * knows, and guessing otherwise would widen the gate.
 */
export function parseRoles(role: string | null | undefined): string[] {
  if (typeof role !== "string") {
    return [];
  }
  return role
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Whether a stored `role` value holds `required` (S5).
 *
 * Membership, not equality: a session with `"user,admin"` is an admin, and a NULL,
 * empty or whitespace-only role holds nothing.
 */
export function hasRole(
  role: string | null | undefined,
  required: string,
): boolean {
  return parseRoles(role).includes(required);
}

/**
 * Gate for the curated-content writes (S5, S6).
 *
 * 401 when there is no session and 403 when the session does not hold `required`.
 * Both are thrown as the project's `AppError` subclasses so `handleApiError` renders
 * the usual `{ error, code }` envelope every `/v1` route uses.
 */
export function requireRole(
  required: string,
  resolveRole: SessionRoleResolver,
): MiddlewareHandler<AppEnv> {
  return createMiddleware<AppEnv>(async (c, next) => {
    const session = await resolveRole(c.req.raw.headers);

    if (!session) {
      throw new UnauthorizedError("Authentication required");
    }

    if (!hasRole(session.role, required)) {
      throw new ForbiddenError(`The "${required}" role is required`);
    }

    await next();
  });
}
