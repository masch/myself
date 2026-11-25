import { AsyncLocalStorage } from "node:async_hooks";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { admin, bearer } from "better-auth/plugins";
import { authSchema, userNameAndEmailSchema } from "@myself/shared";
import type { AppConfig } from "./config";
import { createDb } from "./infrastructure/persistence/client";

/**
 * The slice of the Workers `ExecutionContext` this module needs.
 *
 * It is declared structurally so the same dispatch code runs on Bun (where Hono has
 * no execution context) and on workerd, without importing `cloudflare:workers` —
 * that specifier cannot be loaded by the Bun test runner.
 */
export interface BackgroundTaskContext {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Carries the per-request execution context to Better Auth's background dispatcher.
 *
 * The dispatcher has no access to the request, so the context travels out of band.
 * `AsyncLocalStorage` keeps it per-request instead of in a module-level variable,
 * which would leak the context of a concurrent request.
 */
const backgroundContext = new AsyncLocalStorage<BackgroundTaskContext>();

/**
 * Runs `fn` with `ctx` available to `dispatchBackgroundTask`.
 *
 * A missing context (local Bun dev, tests) is expected, not an error: it simply
 * means nothing can be deferred past the response.
 */
export function runWithExecutionContext<T>(
  ctx: BackgroundTaskContext | undefined,
  fn: () => T,
): T {
  if (!ctx) {
    return fn();
  }
  return backgroundContext.run(ctx, fn);
}

/**
 * `advanced.backgroundTasks.handler` (S14).
 *
 * Verification and reset emails are dispatched here so the auth response does not
 * wait for them, which is what keeps sign-up and reset response times independent of
 * whether an address exists (timing-attack mitigation). On Workers the promise is
 * handed to `waitUntil`, which keeps the isolate alive until it settles.
 *
 * Degrading safely: without an execution context the task is still started, just not
 * tied to a request lifetime, and a rejection is logged instead of surfacing as an
 * unhandled rejection.
 */
function dispatchBackgroundTask(promise: Promise<unknown>): void {
  const ctx = backgroundContext.getStore();
  if (ctx) {
    ctx.waitUntil(promise);
    return;
  }

  promise.catch((error: unknown) => {
    console.error("[auth] Background task failed:", error);
  });
}

/**
 * Rejects a `user` row the domain `User` would refuse (S3).
 *
 * Better Auth only type-checks `name` as a string, so `name: "   "` would be
 * persisted and `mapUserRow` would then throw on every later read of that row,
 * turning a user listing into a 500. The shared user-input schema is applied here,
 * at the write boundary, and the rejection surfaces as a normal 400 instead.
 *
 * `partial` is for the update hook, which receives only the fields being written
 * (a ban or a verification sets neither `name` nor `email`). An absent field is
 * skipped; an explicit `null` is not, because it is a caller asking for a null
 * identity field, which the domain `User` refuses on every later read.
 */
function assertValidUserIdentity(
  data: { name?: unknown; email?: unknown },
  partial: boolean,
): void {
  for (const field of ["name", "email"] as const) {
    const value = data[field];
    if (partial && value === undefined) {
      continue;
    }
    if (value === null) {
      throw new APIError("BAD_REQUEST", {
        message: `Invalid user ${field}: expected a string, received null`,
      });
    }
    const parsed = userNameAndEmailSchema.shape[field].safeParse(value);
    if (!parsed.success) {
      throw new APIError("BAD_REQUEST", {
        message:
          parsed.error.issues[0]?.message ??
          `Invalid user ${field}: expected a string`,
      });
    }
  }
}

/**
 * The admin-plugin endpoints this app does not use (S5, S7, S20).
 *
 * `disabledPaths` is read by Better Auth's own router before the endpoint runs, so a
 * disabled path is a plain 404 and cannot be reached with any credentials. Only the
 * two read-only identity lookups S7 needs stay enabled (`/admin/list-users` and
 * `/admin/get-user`); everything else is a mutating identity surface with no feature
 * behind it, and disabling `/admin/set-role` is what makes S20's "no endpoint can
 * grant the admin role" true even for an admin caller.
 *
 * Scope note: this blocks the HTTP surface only. Server-side `auth.api.*` calls (the
 * seed, the tests) do not pass through the router.
 */
export const ADMIN_DISABLED_PATHS = [
  // Impersonation: no such feature, and it is the highest-risk surface here.
  "/admin/impersonate-user",
  "/admin/stop-impersonating",
  // Roles: the seed is the only producer of `admin` (S20), so nothing may set one.
  "/admin/set-role",
  "/admin/has-permission",
  // Identity lifecycle: accounts come from sign-up, not from an admin call.
  "/admin/create-user",
  "/admin/update-user",
  "/admin/remove-user",
  "/admin/set-user-password",
  // Moderation: v1 has no ban feature.
  "/admin/ban-user",
  "/admin/unban-user",
  // Session administration: reset revocation belongs to the reset flow (S2, T4).
  "/admin/list-user-sessions",
  "/admin/revoke-user-session",
  "/admin/revoke-user-sessions",
];

/**
 * The Better Auth instance (S1).
 *
 * Wiring notes that must not be lost:
 * - `schema` is mandatory for `drizzleAdapter`, otherwise it fails with
 *   `SCHEMA_MISMATCH`.
 * - `advanced.database.generateId` returns UUIDs because the domain `User` validates
 *   `entityIdSchema`; Better Auth's default generator returns a 32-character
 *   non-UUID id, which makes `mapUserRow` throw on real sign-ups.
 * - `ipAddressHeaders` is `cf-connecting-ip`: Workers do not send `X-Forwarded-For`,
 *   and without it the auth rate limiter collapses into a single bucket.
 * - `account.encryptOAuthTokens` keeps the Google access and refresh tokens out of
 *   the database in plaintext, but only when a real `secret` is configured
 *   (R1-001). Better Auth 1.7.28 encrypts exactly those two token columns and
 *   writes `idToken` through unchanged, so no claim beyond them is made. The
 *   library derives its key from `secret` and falls back to a publicly known
 *   default, so encrypting without one would claim a confidentiality the
 *   deployment does not have. Fail-closed: never encrypt under the default key,
 *   warn once at startup instead.
 * - `rateLimit.enabled` is set explicitly from the resolved `ENVIRONMENT` (L22):
 *   the library only enables its limiter when `NODE_ENV` says production, which
 *   this app never sets, so leaving it unset kept sign-in throttling off in every
 *   environment, staging included.
 * - `transaction` is enabled on the Drizzle adapter so Better Auth's
 *   `runWithTransaction` wraps a sign-up's `user` and `account` writes in one
 *   libSQL transaction (L22).
 * - Google is only registered when both credentials are configured, so a checkout
 *   without them still boots.
 */
export function createAuth(config: AppConfig) {
  const db = createDb(config.database);
  const { secret, baseUrl, google, rateLimit } = config.auth;
  const encryptOAuthTokens = Boolean(secret);

  // One warning per boot (createAuth runs once, when the app is built), not per
  // request: the operator needs to see it, but it must not flood the log.
  if (!encryptOAuthTokens) {
    console.warn(
      "[auth] Provider tokens (Google access and refresh tokens) are stored unencrypted because AUTH_SECRET is not set. Set AUTH_SECRET to encrypt them; encrypting without one would use Better Auth's publicly known default key.",
    );
  }

  return betterAuth({
    secret,
    baseURL: baseUrl,
    // The browser's own origin must be trusted for Better Auth to accept its requests;
    // without this the library answers `Invalid origin` before any credential is read.
    trustedOrigins: config.cors.allowedOrigins,
    rateLimit,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authSchema,
      // Better Auth wraps a sign-up in `runWithTransaction`; with the adapter's
      // default this option is `false` and those writes are applied one by one, so
      // a failed credential insert left an orphan user that blocked the retry.
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: google ? { google } : undefined,
    account: {
      encryptOAuthTokens,
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            assertValidUserIdentity(user, false);
          },
        },
        update: {
          before: async (data) => {
            assertValidUserIdentity(data, true);
          },
        },
      },
    },
    plugins: [bearer(), admin()],
    disabledPaths: ADMIN_DISABLED_PATHS,
    advanced: {
      database: {
        generateId: () => crypto.randomUUID(),
      },
      ipAddress: {
        // Better Auth 1.7 reads the headers from this flat field; the older nested
        // `ipAddress.config.ipAddressHeaders` shape is accepted but ignored, which
        // silently falls back to `x-forwarded-for` on Workers.
        ipAddressHeaders: ["cf-connecting-ip"],
      },
      backgroundTasks: {
        handler: dispatchBackgroundTask,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
