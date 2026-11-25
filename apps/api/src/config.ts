import type { ApiBindings, Environment } from "./types";
import { Environments, isValidEnvironment, VALID_ENVIRONMENTS } from "./types";

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

export interface GoogleProviderConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * Everything the Better Auth instance needs from the environment (S1).
 *
 * Google is optional as a whole: a checkout without Google credentials must still
 * boot, so the provider is only described when both of its values are present.
 */
export interface AuthConfig {
  secret?: string;
  baseUrl: string;
  google?: GoogleProviderConfig;
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

export const DEFAULT_AUTH_BASE_URL = "http://localhost:8787";

/**
 * Environments where a missing Better Auth secret is fatal.
 *
 * Better Auth's own default-secret guard keys off `NODE_ENV === "production"`,
 * which this app never sets — it uses `ENVIRONMENT`. Without this check,
 * `ENVIRONMENT=staging` with no secret would silently sign sessions with Better
 * Auth's public default secret, so every session token would be forgeable.
 */
export const SECRET_REQUIRED_ENVIRONMENTS: readonly Environment[] = [
  Environments.STAGING,
  Environments.PRODUCTION,
];

export function resolveAuthConfig(
  environment: Environment,
  bindings: Partial<ApiBindings> = {},
): AuthConfig {
  // Required positionally, and re-resolved here so a caller that escapes the type
  // system (plain JS, `as any`) cannot reach the staging/production secret guard
  // with an environment nobody chose.
  const resolvedEnvironment = resolveEnvironment(environment);
  const clientId = bindings.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = bindings.GOOGLE_CLIENT_SECRET?.trim();
  const secret = bindings.BETTER_AUTH_SECRET?.trim() || undefined;

  // Google stays independent of this check: a deployment without Google still
  // needs the secret, and a Google deployment without it is just as fatal.
  if (!secret && SECRET_REQUIRED_ENVIRONMENTS.includes(resolvedEnvironment)) {
    throw new Error(
      `Missing required configuration: BETTER_AUTH_SECRET. ENVIRONMENT="${resolvedEnvironment}" requires an explicit secret, because Better Auth otherwise signs sessions with its public default secret`,
    );
  }

  return {
    secret,
    baseUrl: bindings.BETTER_AUTH_URL?.trim() || DEFAULT_AUTH_BASE_URL,
    google: clientId && clientSecret ? { clientId, clientSecret } : undefined,
  };
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
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    ADMIN_USER_PASSWORD: process.env.ADMIN_USER_PASSWORD,
  };
}

/**
 * Password of the single admin identity the seed creates (S20, R1-001).
 *
 * Deliberately not part of `AuthConfig`: it is not an option of the Better Auth
 * instance, it is the value the seed hashes into the admin account. Absent (or blank)
 * means "seed no admin" and the seed warns — there is no fallback credential, because
 * a committed one would hand every deploy that runs the seed a published admin account.
 */
export function resolveAdminUserPassword(
  bindings: Partial<ApiBindings> = {},
): string | undefined {
  return bindings.ADMIN_USER_PASSWORD?.trim() || undefined;
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
  readonly auth: AuthConfig;
  /** Admin seed credential (S20, R1-001); `undefined` means "seed no admin". */
  readonly adminUserPassword?: string;

  constructor(bindings: Partial<ApiBindings> = {}) {
    this.environment = resolveEnvironment(bindings.ENVIRONMENT);
    this.port = resolvePort(bindings.PORT);
    this.auth = resolveAuthConfig(this.environment, bindings);
    this.database = resolveDatabaseConfig(
      bindings.TURSO_DATABASE_URL,
      bindings.TURSO_AUTH_TOKEN,
    );
    this.adminUserPassword = resolveAdminUserPassword(bindings);
  }

  static from(env?: Partial<ApiBindings>): AppConfig {
    const processBindings = getProcessEnv();
    return new AppConfig({
      ...processBindings,
      ...env,
    });
  }
}
