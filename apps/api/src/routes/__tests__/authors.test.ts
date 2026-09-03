import { beforeAll, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type {
  ApiResponse,
  PaginatedResponse,
  SeedAuthor,
} from "@myself/shared";
import type { AppEnv } from "../../types";
import { repositoriesMiddleware } from "../../middleware/repositories";
import { createTestRepositories } from "../../db/test-db";
import { authorsRoute } from "../authors";

describe("Authors API Endpoints E2E Tests (HTTP -> SQLite Database)", () => {
  let app: Hono<AppEnv>;

  beforeAll(async () => {
    const repos = await createTestRepositories({ seed: true });
    app = new Hono<AppEnv>()
      .use("*", repositoriesMiddleware(repos))
      .route("/authors", authorsRoute);
  });

  it("isolates authors sub-router and returns paginated list", async () => {
    const res = await app.request("/authors");
    expect(res.status).toBe(200);

    const body = (await res.json()) as ApiResponse<
      PaginatedResponse<SeedAuthor>
    >;
    expect(body.success).toBe(true);
    expect(body.data?.items.length).toBeGreaterThan(0);
    expect(body.data?.meta.limit).toBe(20);
    expect(body.data?.meta.offset).toBe(0);
  });

  it("handles pagination inside authors sub-router independently", async () => {
    const res = await app.request("/authors?limit=1&offset=2");
    expect(res.status).toBe(200);

    const body = (await res.json()) as ApiResponse<
      PaginatedResponse<SeedAuthor>
    >;
    expect(body.data?.items.length).toBe(1);
    expect(body.data?.meta.limit).toBe(1);
    expect(body.data?.meta.offset).toBe(2);
    expect(body.data?.meta.hasMore).toBe(true);
  });
});
