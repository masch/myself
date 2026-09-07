import type {
  AuthorRepository,
  ReadingRepository,
  UserRepository,
} from "./ports";

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
};

export type ApiVariables = {
  authorRepo: AuthorRepository;
  readingRepo: ReadingRepository;
  userRepo: UserRepository;
  environment: Environment;
};

export type AppEnv = {
  Bindings: ApiBindings;
  Variables: ApiVariables;
};
