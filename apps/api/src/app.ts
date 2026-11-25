import { OpenAPIHono } from "@hono/zod-openapi";
import type { ExecutionContext } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppEnv } from "./types";
import type { AppConfig } from "./config";
import { createAuth, runWithExecutionContext } from "./auth";
import {
  createRepositories,
  repositoriesMiddleware,
  type RepositoriesDependencies,
  type RepositoriesProvider,
} from "./middleware/repositories";
import {
  createSessionRoleResolver,
  requireRole,
} from "./middleware/require-role";
import { ErrorCode } from "@myself/shared";
import { handleApiError } from "./errors";
import { authorsRoute } from "./routes/authors";
import { readingsRoute } from "./routes/readings";
import { createSystemRouter } from "./routes/system";
import { registerDocs } from "./docs";
import { fail } from "./lib/response";
import { defaultHook } from "./lib/validator";
import { ADMIN_ROLE } from "@myself/shared";

export function createApp(
  config: AppConfig,
  resolveDeps: RepositoriesDependencies | RepositoriesProvider = () =>
    createRepositories(config),
) {
  const app = new OpenAPIHono<AppEnv>({ defaultHook });
  const startedAt = performance.now();
  const auth = createAuth(config);
  const resolveSessionRole = createSessionRoleResolver(auth);

  // Global Middlewares
  app.use("*", logger());

  /**
   * An origin that is not on the allowlist is refused here, for every path.
   *
   * CORS alone only stops the browser from *reading* the response; the request would
   * still run, which is the difference between a blocked read and a blocked action. A
   * request with no `Origin` at all (native app, CLI, tests) has no cross-origin risk and
   * is served normally.
   */
  app.use("*", async (c, next) => {
    const origin = c.req.header("origin");
    if (origin && !config.cors.allowedOrigins.includes(origin)) {
      return fail(
        c,
        "Origin not allowed: CORS_ALLOWED_ORIGINS does not list this origin",
        403,
        ErrorCode.FORBIDDEN,
      );
    }
    return next();
  });

  // CORS posture for the browser target (S15, S22, S26). An explicit allowlist, never a
  // wildcard: the web session is a cookie, and `Access-Control-Allow-Credentials` cannot
  // coexist with `*`. `set-auth-token` is exposed because the web client reads the token
  // from that header, and the cookie is readable by the browser's own jar.
  app.use(
    "*",
    cors({
      origin: (origin) =>
        config.cors.allowedOrigins.includes(origin) ? origin : null,
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
      exposeHeaders: ["set-auth-token"],
      credentials: true,
      maxAge: 600,
    }),
  );

  // Expose the platform execution context to Better Auth's background dispatcher
  app.use("*", async (c, next) => {
    let executionCtx: ExecutionContext | undefined;
    try {
      executionCtx = c.executionCtx;
    } catch {
      executionCtx = undefined;
    }
    return runWithExecutionContext(executionCtx, next);
  });

  // Global Error & 404 Handlers
  app.notFound((c) => fail(c, "Endpoint not found", 404));
  app.onError(handleApiError);

  // Better Auth routes (/api/auth/*)
  //
  // Deliberately mounted outside the /v1 sub-app and registered without OpenAPI
  // metadata: Better Auth owns its own contract, so none of its endpoints appear in
  // the /doc document and no /v1 versioning applies to them.
  //
  // Deliberate, scoped exception to the `ok`/`fail` response envelope: these responses
  // are produced by Better Auth's own protocol, and wrapping them would break every
  // Better Auth client (its error shape, `set-auth-token` header and redirects are all
  // part of that protocol). The exception applies to /api/auth/* only; every /v1 route
  // keeps the envelope.
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  // System Routes (/, /health)
  app.route(
    "/",
    createSystemRouter({ environment: config.environment, startedAt }),
  );

  // v1 API Route Group (requires database repositories)
  const v1 = new OpenAPIHono<AppEnv>({ defaultHook })
    .use("*", repositoriesMiddleware(resolveDeps))
    // Curated-content writes require the admin role (S6); reads stay public. The gate
    // is registered per write method because Hono middleware matches paths, not
    // methods, and it runs before the route handler, so an unauthenticated bad body
    // is 401 instead of 400.
    .on("POST", "/readings", requireRole(ADMIN_ROLE, resolveSessionRole))
    .on("PUT", "/readings/:id", requireRole(ADMIN_ROLE, resolveSessionRole))
    .on("DELETE", "/readings/:id", requireRole(ADMIN_ROLE, resolveSessionRole))
    .on("POST", "/authors", requireRole(ADMIN_ROLE, resolveSessionRole))
    .route("/authors", authorsRoute)
    .route("/readings", readingsRoute);

  app.route("/v1", v1);

  // OpenAPI 3.1 & Scalar Documentation (/doc, /reference)
  registerDocs(app);

  return app;
}

export type AppType = ReturnType<typeof createApp>;
