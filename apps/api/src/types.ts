import type { AuthorRepository, ReadingRepository } from "./ports";

export const Environments = {
  PRODUCTION: "production",
  STAGING: "staging",
  DEVELOPMENT: "development",
  TEST: "test",
} as const;

export type Environment = (typeof Environments)[keyof typeof Environments];

export const VALID_ENVIRONMENTS = Object.values(Environments);

export function isValidEnvironment(env: string): env is Environment {
  return (VALID_ENVIRONMENTS as readonly string[]).includes(env);
}

export type ApiBindings = {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  ENVIRONMENT?: string;
  PORT?: string;
  AUTH_SECRET?: string;
  AUTH_URL?: string;
  /**
   * The `SameSite` policy of the session cookie (S2): `lax` (default), `strict`, or
   * `none`. `none` is only accepted in an environment whose cookie is `Secure`
   * (staging, production) and is refused at startup anywhere else.
   */
  AUTH_COOKIE_SAME_SITE?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /**
   * Comma-separated list of origins allowed to call this API from a browser (S15,
   * S22, S26). Never a wildcard: the web target authenticates with a cookie, and a
   * credential-bearing response is only readable when the origin is named.
   */
  CORS_ALLOWED_ORIGINS?: string;
  /**
   * Password of the single admin identity the seed creates (S20, R1-001). A secret:
   * the repository carries no admin credential, and an absent value means the seed
   * creates no admin at all.
   */
  ADMIN_USER_PASSWORD?: string;
  /**
   * Envelope sender of every verification and reset message (S16). A real vendor only
   * sends from a verified domain, so this is deployment configuration; it defaults to a
   * placeholder the development sender merely records.
   */
  EMAIL_FROM?: string;
  /**
   * Directory the development email sender writes messages to (S16), so a developer can
   * open the link without a mail client. Absent means the sender's own default (the
   * system temp directory); a deployed environment has no sender at all (R1-002).
   */
  EMAIL_OUTBOX_DIR?: string;
};

export type ApiVariables = {
  authorRepo: AuthorRepository;
  readingRepo: ReadingRepository;
  environment: Environment;
};

export type AppEnv = {
  Bindings: ApiBindings;
  Variables: ApiVariables;
};
