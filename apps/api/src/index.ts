import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { APP_NAME } from "@myself/shared";
import { authorsRoute } from "./routes/authors";
import { readingsRoute } from "./routes/readings";
import { ok, fail } from "./lib/response";

const app = new Hono();
const startedAt = Date.now();

// Global Middlewares
app.use("*", logger());
app.use("*", cors());

// Global Error & 404 Handlers
app.notFound((c) => fail(c, "Endpoint not found", 404));

app.onError((err, c) => {
  console.error("Unhandled API Error:", err);
  return fail(c, "Internal Server Error", 500);
});

// v1 API Route Group
const v1 = new Hono()
  .route("/authors", authorsRoute)
  .route("/readings", readingsRoute);

const routes = app
  .get("/", (c) =>
    ok(c, {
      message: `Welcome to ${APP_NAME} API`,
      timestamp: new Date().toISOString(),
    }),
  )
  .get("/health", (c) =>
    c.json({
      status: "ok",
      uptime: Math.floor((Date.now() - startedAt) / 1000),
    }),
  )
  .route("/v1", v1)
  // Backward compatibility alias for root endpoints
  .route("/authors", authorsRoute)
  .route("/readings", readingsRoute);

export type AppType = typeof routes;
export default app;
