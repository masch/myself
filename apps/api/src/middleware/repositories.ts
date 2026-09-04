import { createMiddleware } from "hono/factory";
import type { AppEnv, ApiBindings } from "../types";
import { createDb, IN_MEMORY_DB } from "../db/client";
import type { AppConfig } from "../config";
import type { AuthorRepository } from "../repositories/contracts/author.repository";
import type { ReadingRepository } from "../repositories/contracts/reading.repository";
import type { UserRepository } from "../repositories/contracts/user.repository";
import { DrizzleAuthorRepository } from "../repositories/drizzle/drizzle-author.repository";
import { DrizzleReadingRepository } from "../repositories/drizzle/drizzle-reading.repository";
import { DrizzleUserRepository } from "../repositories/drizzle/drizzle-user.repository";

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
  const db = createDb({
    url: url === "memory" ? IN_MEMORY_DB : url,
    authToken,
  });

  return {
    authorRepo: new DrizzleAuthorRepository(db),
    readingRepo: new DrizzleReadingRepository(db),
    userRepo: new DrizzleUserRepository(db),
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
