import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { ExecutionContext } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { APP_NAME, HttpStatus } from "@myself/shared";
import type { AppEnv } from "./types";
import { AppConfig } from "./config";
import {
  createRepositories,
  repositoriesMiddleware,
  type RepositoriesDependencies,
  type RepositoriesProvider,
} from "./middleware/repositories";
import { handleApiError } from "./errors";
import { Scalar } from "@scalar/hono-api-reference";
import { authorsRoute } from "./routes/authors";
import { readingsRoute } from "./routes/readings";
import { usersRoute } from "./routes/users";
import { ok, fail } from "./lib/response";
import { defaultHook } from "./lib/validator";

export const rootRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["System"],
  summary: "API Welcome",
  description: "Returns greeting and current server timestamp.",
  responses: {
    [HttpStatus.OK]: {
      description: "Welcome message payload",
    },
  },
});

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "System Health & Uptime",
  description: "Returns health status and uptime in seconds.",
  responses: {
    [HttpStatus.OK]: {
      description: "Health status ok",
    },
  },
});

export function createApp(
  resolveDeps: RepositoriesDependencies | RepositoriesProvider = (env) =>
    createRepositories(AppConfig.from(env)),
) {
  const app = new OpenAPIHono<AppEnv>({ defaultHook });
  const startedAt = Date.now();

  // Global Middlewares
  app.use("*", logger());
  app.use("*", cors());

  // Global Error & 404 Handlers
  app.notFound((c) => fail(c, "Endpoint not found", 404));
  app.onError(handleApiError);

  // v1 API Route Group (requires database repositories)
  const v1 = new OpenAPIHono<AppEnv>({ defaultHook })
    .use("*", repositoriesMiddleware(resolveDeps))
    .route("/authors", authorsRoute)
    .route("/readings", readingsRoute)
    .route("/users", usersRoute);

  const routes = app
    .openapi(rootRoute, (c) =>
      ok(c, {
        message: `Welcome to ${APP_NAME} API`,
        timestamp: new Date().toISOString(),
      }),
    )
    .openapi(healthRoute, (c) =>
      c.json({
        status: "ok",
        uptime: Math.floor((Date.now() - startedAt) / 1000),
      }),
    )
    .route("/v1", v1);

  // OpenAPI 3.1 Specification auto-generated from all routes
  app.doc31("/doc", {
    openapi: "3.1.0",
    info: {
      title: `${APP_NAME} API`,
      version: "1.0.0",
      description: `OpenAPI 3.1 documentation for the ${APP_NAME} mobile and web backend services.`,
    },
  });

  // Scalar Interactive API Reference
  app.get(
    "/reference",
    Scalar({
      theme: "saturn",
      pageTitle: `${APP_NAME} API Reference`,
      spec: {
        url: "/doc",
      },
    }),
  );

  return app;
}

const app = createApp();

export type AppType = ReturnType<typeof createApp>;
export { app };

export default {
  port:
    typeof process !== "undefined" && process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : 8787,
  fetch(
    request: Request,
    env?: Record<string, string>,
    ctx?: ExecutionContext,
  ) {
    const runtimeEnv =
      env && typeof env.TURSO_DATABASE_URL === "string"
        ? env
        : typeof process !== "undefined"
          ? (process.env as Record<string, string>)
          : {};
    return app.fetch(request, runtimeEnv, ctx);
  },
};
