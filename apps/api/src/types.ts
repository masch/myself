import type { AuthorRepository } from "./repositories/contracts/author.repository";
import type { ReadingRepository } from "./repositories/contracts/reading.repository";
import type { UserRepository } from "./repositories/contracts/user.repository";

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
