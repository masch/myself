import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type {
  ApiResponse,
  PaginatedResponse,
  SeedReading,
} from "@myself/shared";
import { readingsRoute } from "../readings";

describe("apps/api/src/routes/readings.ts Sub-router Unit Tests", () => {
  const app = new Hono().route("/readings", readingsRoute);

  it("isolates readings sub-router and returns paginated list", async () => {
    const res = await app.request("/readings");
    expect(res.status).toBe(200);

    const body = (await res.json()) as ApiResponse<
      PaginatedResponse<SeedReading>
    >;
    expect(body.success).toBe(true);
    expect(body.data?.items.length).toBeGreaterThan(0);
    expect(body.data?.meta.limit).toBe(20);
    expect(body.data?.meta.offset).toBe(0);
  });

  it("handles pagination inside readings sub-router independently", async () => {
    const res = await app.request("/readings?limit=2&offset=2");
    expect(res.status).toBe(200);

    const body = (await res.json()) as ApiResponse<
      PaginatedResponse<SeedReading>
    >;
    expect(body.data?.items.length).toBe(2);
    expect(body.data?.meta.limit).toBe(2);
    expect(body.data?.meta.offset).toBe(2);
  });
});
