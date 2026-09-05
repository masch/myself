import type { ExecutionContext } from "hono";
import { AppConfig, getProcessEnv, resolvePort } from "./config";
import { createApp, type AppType } from "./app";

let defaultApp: ReturnType<typeof createApp> | null = null;

export function resolveRuntimeEnv(
  env?: Record<string, string>,
): Record<string, string> {
  if (env && typeof env.TURSO_DATABASE_URL === "string") {
    return env;
  }
  return getProcessEnv() as Record<string, string>;
}

export function getDefaultApp(
  env?: Record<string, string>,
): ReturnType<typeof createApp> {
  if (!defaultApp) {
    const runtimeEnv = resolveRuntimeEnv(env);
    const config = AppConfig.from(runtimeEnv);
    defaultApp = createApp(config);
  }
  return defaultApp;
}

export { createApp, type AppType };

export default {
  get port(): number {
    return resolvePort(resolveRuntimeEnv().PORT);
  },
  fetch(
    request: Request,
    env?: Record<string, string>,
    ctx?: ExecutionContext,
  ) {
    const runtimeEnv = resolveRuntimeEnv(env);
    return getDefaultApp(runtimeEnv).fetch(request, runtimeEnv, ctx);
  },
};
