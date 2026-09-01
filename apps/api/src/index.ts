import { Hono } from "hono";
import { APP_NAME, ApiResponse } from "@myself/shared";

const app = new Hono();
const startedAt = Date.now();

app.get("/", (c) => {
  const response: ApiResponse<{ message: string; timestamp: string }> = {
    success: true,
    data: {
      message: `Welcome to ${APP_NAME} API`,
      timestamp: new Date().toISOString(),
    },
  };
  return c.json(response);
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startedAt) / 1000),
  });
});

export default app;
