import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { AppConfig } from "../../config";
import { createRepositories, repositoriesMiddleware } from "../repositories";
import { SqliteAuthorRepository } from "../../adapters/persistence/sqlite/sqlite-author.repository";
import { SqliteReadingRepository } from "../../adapters/persistence/sqlite/sqlite-reading.repository";
import { SqliteUserRepository } from "../../adapters/persistence/sqlite/sqlite-user.repository";

describe("repositoriesMiddleware & createRepositories Unit Tests", () => {
  it("creates Drizzle repositories when database url is local file", () => {
    const config = new AppConfig({
      ENVIRONMENT: "test",
      TURSO_DATABASE_URL: "file:test.db",
    });
    const repos = createRepositories(config);
    expect(repos.authorRepo instanceof SqliteAuthorRepository).toBe(true);
    expect(repos.readingRepo instanceof SqliteReadingRepository).toBe(true);
    expect(repos.userRepo instanceof SqliteUserRepository).toBe(true);
  });

  it("creates SQLite repositories when database url is :memory:", () => {
    const config = new AppConfig({
      ENVIRONMENT: "test",
      TURSO_DATABASE_URL: ":memory:",
    });
    const repos = createRepositories(config);
    expect(repos.authorRepo instanceof SqliteAuthorRepository).toBe(true);
    expect(repos.readingRepo instanceof SqliteReadingRepository).toBe(true);
    expect(repos.userRepo instanceof SqliteUserRepository).toBe(true);
  });

  it("injects required repositories into Hono context strictly", async () => {
    const customAuthorRepo = {} as any;
    const customReadingRepo = {} as any;
    const customUserRepo = {} as any;

    const app = new Hono<AppEnv>();
    app.use(
      "*",
      repositoriesMiddleware({
        authorRepo: customAuthorRepo,
        readingRepo: customReadingRepo,
        userRepo: customUserRepo,
      }),
    );

    let injectedAuthorRepo: unknown;
    let injectedReadingRepo: unknown;
    let injectedUserRepo: unknown;

    app.get("/test-custom", (c) => {
      injectedAuthorRepo = c.var.authorRepo;
      injectedReadingRepo = c.var.readingRepo;
      injectedUserRepo = c.var.userRepo;
      return c.json({ ok: true });
    });

    const res = await app.request("/test-custom");
    expect(res.status).toBe(200);
    expect(injectedAuthorRepo).toBe(customAuthorRepo);
    expect(injectedReadingRepo).toBe(customReadingRepo);
    expect(injectedUserRepo).toBe(customUserRepo);
  });

  it("injects repositories when passed a RepositoriesProvider function", async () => {
    const customAuthorRepo = {} as any;
    const customReadingRepo = {} as any;
    const customUserRepo = {} as any;

    const app = new Hono<AppEnv>();
    app.use(
      "*",
      repositoriesMiddleware(() => ({
        authorRepo: customAuthorRepo,
        readingRepo: customReadingRepo,
        userRepo: customUserRepo,
      })),
    );

    let injectedAuthorRepo: unknown;

    app.get("/test-provider", (c) => {
      injectedAuthorRepo = c.var.authorRepo;
      return c.json({ ok: true });
    });

    const res = await app.request("/test-provider");
    expect(res.status).toBe(200);
    expect(injectedAuthorRepo).toBe(customAuthorRepo);

    const res2 = await app.request("/test-provider");
    expect(res2.status).toBe(200);
    expect(injectedAuthorRepo).toBe(customAuthorRepo);
  });
});
