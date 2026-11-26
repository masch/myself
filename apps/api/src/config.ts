import type { ApiBindings, Environment } from "./types";
import { Environments, isValidEnvironment, VALID_ENVIRONMENTS } from "./types";

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

/**
 * The browser origins this API may be called from (S15, S22, S26).
 *
 * An explicit allowlist is what makes the cookie transport sound: `Access-Control-Allow-
 * Credentials` and a wildcard origin cannot coexist, so the origin has to be named. The
 * list is also handed to Better Auth as `trustedOrigins`, because the library rejects a
 * request whose `Origin` it does not trust (it answered `Invalid origin` before this).
 */
export interface CorsConfig {
  allowedOrigins: string[];
}

const WILDCARD_ORIGIN = "*";

function parseOrigin(entry: string): string {
  if (entry === WILDCARD_ORIGIN) {
    throw new Error(
      'Invalid CORS_ALLOWED_ORIGINS configuration: "*" is not allowed, because credentialed CORS cannot use a wildcard. Name each origin explicitly',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(entry);
  } catch {
    throw new Error(
      `Invalid CORS_ALLOWED_ORIGINS entry: "${entry}". Expected an origin such as https://app.example.com`,
    );
  }

  // An origin is scheme + host + port, and nothing else: a path, a query or a
  // trailing slash in the configuration would silently never match a request.
  if (parsed.origin !== entry) {
    throw new Error(
      `Invalid CORS_ALLOWED_ORIGINS entry: "${entry}". Expected a bare origin with no path or trailing slash, such as https://app.example.com`,
    );
  }

  return parsed.origin;
}

/**
 * Reads the allowlist. An absent or blank value means "no browser origin is allowed",
 * which is the fail-closed default: native clients send no `Origin` and are unaffected.
 */
export function resolveCorsConfig(
  raw?: string,
  environment: Environment = Environments.DEVELOPMENT,
): CorsConfig {
  const entries = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const allowedOrigins = entries.map(parseOrigin);

  if (allowedOrigins.length === 0) {
    // Not fatal (an API with no browser client is legitimate), but a deployment that
    // forgot it would refuse every browser request, and that must not be a surprise
    // discovered by a user. One line per boot, not per request.
    if (SECRET_REQUIRED_ENVIRONMENTS.includes(environment)) {
      console.warn(
        "[cors] CORS_ALLOWED_ORIGINS is empty: no browser origin may call this API. Set it (comma-separated origins) for the web target.",
      );
    }
  }

  return { allowedOrigins };
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
  rateLimit: AuthRateLimitConfig;
}

/**
 * The auth rate limiter's rule, expressed in the library's own terms.
 *
 * `window` is in seconds and `max` is the number of requests allowed within it;
 * both match Better Auth 1.7.28's defaults.
 */
export interface AuthRateLimitConfig {
  enabled: boolean;
  window: number;
  max: number;
}

/**
 * Environments where the auth rate limiter must run (S14, L22).
 *
 * Both are deployed and reachable from the internet, and better-auth's built-in rule
 * (3 sign-in/sign-up attempts per 10 seconds per address) is the brute-force guard
 * for the password endpoints. `development` and `test` are local, not internet-facing,
 * and the library itself keeps its limiter off there; enabling it locally would only
 * punish rapid manual sign-ins and throttle the test suite.
 */
export const RATE_LIMIT_ENVIRONMENTS: readonly Environment[] = [
  Environments.STAGING,
  Environments.PRODUCTION,
];

/** Better Auth 1.7.28 default window, in seconds. */
export const RATE_LIMIT_WINDOW_SECONDS = 10;

/** Better Auth 1.7.28 default request budget per window. */
export const RATE_LIMIT_MAX_REQUESTS = 100;

/**
 * The limiter state for an environment, set explicitly.
 *
 * Better Auth enables its limiter only when `isProduction` (its `NODE_ENV` read) is
 * true. This app sets `ENVIRONMENT`, not `NODE_ENV`, and Wrangler's build-time
 * replacement does not reach the library's proxied read, so the library's default
 * left sign-in throttling off everywhere. The decision is made here instead, from the
 * environment the app actually resolves.
 */
export function resolveRateLimitConfig(
  environment: Environment,
): AuthRateLimitConfig {
  return {
    enabled: RATE_LIMIT_ENVIRONMENTS.includes(environment),
    window: RATE_LIMIT_WINDOW_SECONDS,
    max: RATE_LIMIT_MAX_REQUESTS,
  };
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

/**
 * Environments that run as a deployed Worker (S16).
 *
 * The development email sender refuses to be constructed in any of them (R1-002): it
 * writes verification and reset links to a file and to the log, and both links carry a
 * live single-use token. Staging is included because it is a deployed Worker with a
 * publicly reachable URL and no local filesystem, so its "written message" would be
 * lost while the logged token would be exposed — the same leak, with a worse outcome.
 */
export const DEPLOYED_ENVIRONMENTS: readonly Environment[] = [
  Environments.STAGING,
  Environments.PRODUCTION,
];

/**
 * The email sender's configuration (S16).
 *
 * `from` is configuration and not a template literal because every real vendor sends
 * only from an address whose domain is verified on the account, so the value belongs
 * to the deployment. `outboxDir` is a development detail: where the development sender
 * writes the message a developer opens instead of using a mail client.
 */
export interface EmailConfig {
  from: string;
  outboxDir?: string;
}

/** Placeholder sender the development implementation records; no vendor accepts it. */
export const DEFAULT_EMAIL_FROM = "no-reply@myself.local";

export function resolveEmailConfig(
  bindings: Partial<ApiBindings> = {},
): EmailConfig {
  return {
    from: bindings.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM,
    // Absent means "the sender picks its own default" (the system temp directory),
    // which is the right place for a file that must never be committed.
    outboxDir: bindings.EMAIL_OUTBOX_DIR?.trim() || undefined,
  };
}

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
  const secret = bindings.AUTH_SECRET?.trim() || undefined;

  // Google stays independent of this check: a deployment without Google still
  // needs the secret, and a Google deployment without it is just as fatal.
  if (!secret && SECRET_REQUIRED_ENVIRONMENTS.includes(resolvedEnvironment)) {
    throw new Error(
      `Missing required configuration: AUTH_SECRET. ENVIRONMENT="${resolvedEnvironment}" requires an explicit secret, because Better Auth otherwise signs sessions with its public default secret`,
    );
  }

  return {
    secret,
    baseUrl: bindings.AUTH_URL?.trim() || DEFAULT_AUTH_BASE_URL,
    google: clientId && clientSecret ? { clientId, clientSecret } : undefined,
    rateLimit: resolveRateLimitConfig(resolvedEnvironment),
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
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
    ADMIN_USER_PASSWORD: process.env.ADMIN_USER_PASSWORD,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_OUTBOX_DIR: process.env.EMAIL_OUTBOX_DIR,
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
  /** Browser origin allowlist (S15, S22, S26); empty means no browser origin. */
  readonly cors: CorsConfig;
  /** Admin seed credential (S20, R1-001); `undefined` means "seed no admin". */
  readonly adminUserPassword?: string;
  /** Email sender configuration (S16). */
  readonly email: EmailConfig;

  constructor(bindings: Partial<ApiBindings> = {}) {
    this.environment = resolveEnvironment(bindings.ENVIRONMENT);
    this.port = resolvePort(bindings.PORT);
    this.auth = resolveAuthConfig(this.environment, bindings);
    this.cors = resolveCorsConfig(
      bindings.CORS_ALLOWED_ORIGINS,
      this.environment,
    );
    this.database = resolveDatabaseConfig(
      bindings.TURSO_DATABASE_URL,
      bindings.TURSO_AUTH_TOKEN,
    );
    this.adminUserPassword = resolveAdminUserPassword(bindings);
    this.email = resolveEmailConfig(bindings);
  }

  static from(env?: Partial<ApiBindings>): AppConfig {
    const processBindings = getProcessEnv();
    return new AppConfig({
      ...processBindings,
      ...env,
    });
  }
}
