import type { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { APP_NAME } from "@myself/shared";
import type { AppEnv } from "./types";

export function registerDocs(app: OpenAPIHono<AppEnv>) {
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
}
