import type { ApiBindings } from "./types";

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

export class AppConfig {
  readonly database: DatabaseConfig;

  constructor(env: Partial<ApiBindings> = {}) {
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
