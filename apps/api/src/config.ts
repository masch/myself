import type { ApiBindings, Environment } from "./types";
import { isValidEnvironment, VALID_ENVIRONMENTS } from "./types";

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

export const DEFAULT_ENVIRONMENT: Environment = "development";

export function resolveEnvironment(raw?: string): Environment {
  if (!raw) {
    throw new Error(
      `Missing required ENVIRONMENT configuration. Expected one of: ${VALID_ENVIRONMENTS.join(", ")}`,
    );
  }

  if (!isValidEnvironment(raw)) {
    throw new Error(
      `Invalid ENVIRONMENT configuration: "${raw}". Expected one of: ${VALID_ENVIRONMENTS.join(", ")}`,
    );
  }

  return raw;
}

export const DEFAULT_PORT = 8787;

export function resolvePort(raw?: string): number {
  if (!raw) {
    return DEFAULT_PORT;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(
      `Invalid PORT configuration: "${raw}". Expected a valid TCP port number between 1 and 65535`,
    );
  }
  return parsed;
}

export function getProcessEnv(): Partial<ApiBindings> {
  if (typeof process === "undefined" || !process.env) {
    return {};
  }
  return {
    ENVIRONMENT: process.env.ENVIRONMENT,
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
    PORT: process.env.PORT,
  };
}

export function resolveDatabaseConfig(
  url?: string,
  authToken?: string,
): DatabaseConfig {
  if (!url) {
    throw new Error("Missing required configuration: TURSO_DATABASE_URL");
  }
  return {
    url,
    authToken,
  };
}

export class AppConfig {
  readonly database: DatabaseConfig;
  readonly environment: Environment;
  readonly port: number;

  constructor(bindings: Partial<ApiBindings> = {}) {
    this.environment = resolveEnvironment(bindings.ENVIRONMENT);
    this.port = resolvePort(bindings.PORT);
    this.database = resolveDatabaseConfig(
      bindings.TURSO_DATABASE_URL,
      bindings.TURSO_AUTH_TOKEN,
    );
  }

  static from(env?: Partial<ApiBindings>): AppConfig {
    const processBindings = getProcessEnv();
    return new AppConfig({
      ...processBindings,
      ...env,
    });
  }
}
