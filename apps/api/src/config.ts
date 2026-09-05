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

export class AppConfig {
  readonly database: DatabaseConfig;
  readonly environment: Environment;

  constructor(env: Partial<ApiBindings> = {}) {
    const rawEnv =
      env.ENVIRONMENT ??
      (typeof process !== "undefined" ? process.env?.ENVIRONMENT : undefined);
    this.environment = resolveEnvironment(rawEnv);

    const url = env.TURSO_DATABASE_URL;
    if (!url) {
      throw new Error("Missing required configuration: TURSO_DATABASE_URL");
    }

    this.database = {
      url,
      authToken: env.TURSO_AUTH_TOKEN,
    };
  }

  static from(env?: Partial<ApiBindings>): AppConfig {
    return new AppConfig(env);
  }
}
