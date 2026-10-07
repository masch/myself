import { beforeAll, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type { PaginatedResponse, ReadingDto } from "@myself/shared";
import type { AppEnv } from "../../types";
import { repositoriesMiddleware } from "../../middleware/repositories";
import { createTestRepositories } from "../../infrastructure/persistence/test-db";
import { handleApiError } from "../../errors";
import { readingsRoute } from "../readings";

describe("Readings API Endpoints E2E Tests (HTTP -> SQLite Database)", () => {
  let app: Hono<AppEnv>;

  beforeAll(async () => {
    const repos = await createTestRepositories({ seed: true });
    app = new Hono<AppEnv>()
      .onError(handleApiError)
      .use("*", repositoriesMiddleware(repos))
      .route("/readings", readingsRoute);
  });

  it("isolates readings sub-router and returns paginated list", async () => {
    const res = await app.request("/readings");
    expect(res.status).toBe(200);

    const body = (await res.json()) as PaginatedResponse<ReadingDto>;
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.meta.limit).toBe(20);
    expect(body.meta.offset).toBe(0);
  });

  it("handles pagination inside readings sub-router independently", async () => {
    const res = await app.request("/readings?limit=2&offset=2");
    expect(res.status).toBe(200);

    const body = (await res.json()) as PaginatedResponse<ReadingDto>;
    expect(body.items.length).toBe(2);
    expect(body.meta.limit).toBe(2);
    expect(body.meta.offset).toBe(2);
  });

  it("updates reading version on PUT /readings/:id with matching version", async () => {
    const listRes = await app.request("/readings?limit=1");
    const listBody = (await listRes.json()) as PaginatedResponse<ReadingDto>;
    const target = listBody.items[0];

    const updateRes = await app.request(`/readings/${target.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: target.version,
        translations: {
          es: { title: "Nuevo Titulo", content: "Nuevo Contenido" },
        },
      }),
    });

    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()) as ReadingDto;
    expect(updated.version).toBe((target.version ?? 1) + 1);
  });

  it("rejects PUT /readings/:id with 409 Conflict when version is stale", async () => {
    const listRes = await app.request("/readings?limit=1");
    const listBody = (await listRes.json()) as PaginatedResponse<ReadingDto>;
    const target = listBody.items[0];

    const conflictRes = await app.request(`/readings/${target.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: 999, // mismatched version
        translations: {
          es: { title: "Stale Edit", content: "Stale Content" },
        },
      }),
    });

    expect(conflictRes.status).toBe(409);
    const errorBody = (await conflictRes.json()) as {
      error: string;
      code: string;
    };
    expect(errorBody.code).toBe("CONFLICT");
  });
});
