import type { ExecutionContext } from "hono";
import { AppConfig } from "./config";
import { createApp, type AppType } from "./app";

let defaultApp: ReturnType<typeof createApp> | null = null;

export function getDefaultApp(
  env?: Record<string, string>,
): ReturnType<typeof createApp> {
  if (!defaultApp) {
    const runtimeEnv =
      env && typeof env.TURSO_DATABASE_URL === "string"
        ? env
        : typeof process !== "undefined"
          ? (process.env as Record<string, string>)
          : {};
    const config = AppConfig.from(runtimeEnv);
    defaultApp = createApp(config);
  }
  return defaultApp;
}

let eagerApp: ReturnType<typeof createApp> | null = null;
if (
  typeof process !== "undefined" &&
  process.env?.ENVIRONMENT &&
  process.env?.TURSO_DATABASE_URL
) {
  try {
    eagerApp = createApp(AppConfig.from(process.env as any));
  } catch {
    // Ignored if boot requirements are not met yet
  }
}

export { createApp, type AppType, eagerApp as app };

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
    return getDefaultApp(runtimeEnv).fetch(request, runtimeEnv, ctx);
  },
};
