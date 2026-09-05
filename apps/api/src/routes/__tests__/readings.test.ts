import { beforeAll, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type {
  PaginatedResponse,
  SeedReading,
} from "@myself/shared";
import type { AppEnv } from "../../types";
import { repositoriesMiddleware } from "../../middleware/repositories";
import { createTestRepositories } from "../../db/test-db";
import { readingsRoute } from "../readings";

describe("Readings API Endpoints E2E Tests (HTTP -> SQLite Database)", () => {
  let app: Hono<AppEnv>;

  beforeAll(async () => {
    const repos = await createTestRepositories({ seed: true });
    app = new Hono<AppEnv>()
      .use("*", repositoriesMiddleware(repos))
      .route("/readings", readingsRoute);
  });

  it("isolates readings sub-router and returns paginated list", async () => {
    const res = await app.request("/readings");
    expect(res.status).toBe(200);

    const body = (await res.json()) as PaginatedResponse<SeedReading>;
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.meta.limit).toBe(20);
    expect(body.meta.offset).toBe(0);
  });

  it("handles pagination inside readings sub-router independently", async () => {
    const res = await app.request("/readings?limit=2&offset=2");
    expect(res.status).toBe(200);

    const body = (await res.json()) as PaginatedResponse<SeedReading>;
    expect(body.items.length).toBe(2);
    expect(body.meta.limit).toBe(2);
    expect(body.meta.offset).toBe(2);
  });
});
