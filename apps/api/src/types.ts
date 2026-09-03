import type { AuthorRepository } from "./repositories/contracts/author.repository";
import type { ReadingRepository } from "./repositories/contracts/reading.repository";
import type { UserRepository } from "./repositories/contracts/user.repository";

export type ApiBindings = {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
};

export type ApiVariables = {
  authorRepo: AuthorRepository;
  readingRepo: ReadingRepository;
  userRepo: UserRepository;
};

export type AppEnv = {
  Bindings: ApiBindings;
  Variables: ApiVariables;
};
