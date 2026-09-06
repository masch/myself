import { createMiddleware } from "hono/factory";
import type { AppEnv, ApiBindings } from "../types";
import { createDb } from "../db/client";
import type { AppConfig } from "../config";
import type {
  AuthorRepository,
  ReadingRepository,
  UserRepository,
} from "../ports";
import { SqliteAuthorRepository } from "../adapters/persistence/sqlite/sqlite-author.repository";
import { SqliteReadingRepository } from "../adapters/persistence/sqlite/sqlite-reading.repository";
import { SqliteUserRepository } from "../adapters/persistence/sqlite/sqlite-user.repository";

export interface RepositoriesDependencies {
  authorRepo: AuthorRepository;
  readingRepo: ReadingRepository;
  userRepo: UserRepository;
}

export type RepositoriesProvider = (
  env: ApiBindings,
) => RepositoriesDependencies;

export function createRepositories(
  config: AppConfig,
): RepositoriesDependencies {
  const { url, authToken } = config.database;
  const db = createDb({ url, authToken });

  return {
    authorRepo: new SqliteAuthorRepository(db),
    readingRepo: new SqliteReadingRepository(db),
    userRepo: new SqliteUserRepository(db),
  };
}

export function repositoriesMiddleware(
  provider: RepositoriesDependencies | RepositoriesProvider,
) {
  let resolve =
    typeof provider === "function"
      ? (env: ApiBindings) => {
          const deps = provider(env);
          resolve = () => deps;
          return deps;
        }
      : () => provider;

  return createMiddleware<AppEnv>(async (c, next) => {
    const deps = resolve(c.env);
    c.set("authorRepo", deps.authorRepo);
    c.set("readingRepo", deps.readingRepo);
    c.set("userRepo", deps.userRepo);
    await next();
  });
}
