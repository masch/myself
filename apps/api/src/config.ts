import type { ApiBindings, Environment } from "./types";
import { isValidEnvironment, VALID_ENVIRONMENTS } from "./types";

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

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
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid PORT configuration: "${raw}". Expected a positive number`,
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

export class AppConfig {
  readonly database: DatabaseConfig;
  readonly environment: Environment;
  readonly port: number;

  constructor(env: Partial<ApiBindings> = {}) {
    const processBindings = getProcessEnv();
    const rawEnv = env.ENVIRONMENT ?? processBindings.ENVIRONMENT;
    this.environment = resolveEnvironment(rawEnv);

    const rawPort = env.PORT ?? processBindings.PORT;
    this.port = resolvePort(rawPort);

    const url = env.TURSO_DATABASE_URL ?? processBindings.TURSO_DATABASE_URL;
    if (!url) {
      throw new Error("Missing required configuration: TURSO_DATABASE_URL");
    }

    this.database = {
      url,
      authToken: env.TURSO_AUTH_TOKEN ?? processBindings.TURSO_AUTH_TOKEN,
    };
  }

  static from(env?: Partial<ApiBindings>): AppConfig {
    return new AppConfig(env);
  }
}
