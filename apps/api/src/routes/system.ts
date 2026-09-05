import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { APP_NAME, DateTime, HttpStatus } from "@myself/shared";
import type { AppEnv, Environment } from "../types";
import { defaultHook } from "../lib/validator";
import { ok } from "../lib/response";

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

export interface SystemRouterOptions {
  environment: Environment;
  startedAt?: number;
}

export function createSystemRouter(options: SystemRouterOptions) {
  const startedAt = options.startedAt ?? Date.now();

  return new OpenAPIHono<AppEnv>({ defaultHook })
    .openapi(rootRoute, (c) =>
      ok(c, {
        message: `Welcome to ${APP_NAME} API`,
        timestamp: DateTime.now().toISOString(),
      }),
    )
    .openapi(healthRoute, (c) =>
      ok(c, {
        status: "ok",
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        environment: options.environment,
      }),
    );
}
