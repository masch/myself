import { AsyncLocalStorage } from "node:async_hooks";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { admin, bearer } from "better-auth/plugins";
import { authSchema } from "@myself/shared";
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
 * - Google is only registered when both credentials are configured, so a checkout
 *   without them still boots.
 */
export function createAuth(config: AppConfig) {
  const db = createDb(config.database);
  const { secret, baseUrl, google } = config.auth;

  return betterAuth({
    secret,
    baseURL: baseUrl,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: google ? { google } : undefined,
    plugins: [bearer(), admin()],
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
