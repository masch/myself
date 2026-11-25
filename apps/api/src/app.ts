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
import { handleApiError } from "./errors";
import { authorsRoute } from "./routes/authors";
import { readingsRoute } from "./routes/readings";
import { usersRoute } from "./routes/users";
import { createSystemRouter } from "./routes/system";
import { registerDocs } from "./docs";
import { fail } from "./lib/response";
import { defaultHook } from "./lib/validator";

export function createApp(
  config: AppConfig,
  resolveDeps: RepositoriesDependencies | RepositoriesProvider = () =>
    createRepositories(config),
) {
  const app = new OpenAPIHono<AppEnv>({ defaultHook });
  const startedAt = performance.now();
  const auth = createAuth(config);

  // Global Middlewares
  app.use("*", logger());
  app.use("*", cors());

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
  app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  // System Routes (/, /health)
  app.route(
    "/",
    createSystemRouter({ environment: config.environment, startedAt }),
  );

  // v1 API Route Group (requires database repositories)
  const v1 = new OpenAPIHono<AppEnv>({ defaultHook })
    .use("*", repositoriesMiddleware(resolveDeps))
    .route("/authors", authorsRoute)
    .route("/readings", readingsRoute)
    .route("/users", usersRoute);

  app.route("/v1", v1);

  // OpenAPI 3.1 & Scalar Documentation (/doc, /reference)
  registerDocs(app);

  return app;
}

export type AppType = ReturnType<typeof createApp>;
