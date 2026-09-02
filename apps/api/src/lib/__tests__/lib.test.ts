import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type { ApiResponse } from "@myself/shared";
import { buildPaginated } from "../pagination";
import { ok, fail } from "../response";
import { validatedJson, validatedQuery } from "../validator";
import { z } from "zod";

describe("apps/api/src/lib Unit Tests", () => {
  describe("pagination.ts: buildPaginated()", () => {
    it("builds correct pagination metadata when more items are available", () => {
      const items = ["a", "b", "c"];
      const result = buildPaginated(items, 10, 3, 0);

      expect(result.items).toEqual(["a", "b", "c"]);
      expect(result.meta).toEqual({
        total: 10,
        limit: 3,
        offset: 0,
        hasMore: true,
      });
    });

    it("sets hasMore to false when offset + items reached the total", () => {
      const items = ["d", "e"];
      const result = buildPaginated(items, 5, 3, 3);

      expect(result.items).toEqual(["d", "e"]);
      expect(result.meta).toEqual({
        total: 5,
        limit: 3,
        offset: 3,
        hasMore: false,
      });
    });

    it("handles empty items array gracefully", () => {
      const result = buildPaginated([], 0, 10, 0);
      expect(result.items).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  describe("response.ts: ok() and fail()", () => {
    it("ok() formats response with success: true and custom status code", async () => {
      const testApp = new Hono().get("/test", (c) =>
        ok(c, { hello: "world" }, 201),
      );

      const res = await testApp.request("/test");
      expect(res.status).toBe(201);

      const body = (await res.json()) as ApiResponse<{ hello: string }>;
      expect(body.success).toBe(true);
      expect(body.data?.hello).toBe("world");
      expect(body.error).toBeUndefined();
    });

    it("fail() formats response with success: false and custom status code", async () => {
      const testApp = new Hono().get("/test-error", (c) =>
        fail(c, "Something went wrong", 403),
      );

      const res = await testApp.request("/test-error");
      expect(res.status).toBe(403);

      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error).toBe("Something went wrong");
      expect(body.data).toBeUndefined();
    });
  });

  describe("validator.ts: validatedJson() and validatedQuery()", () => {
    const dummySchema = z.object({
      field: z.string().min(3, "Field too short"),
    });

    it("validatedJson passes valid body to handler", async () => {
      const testApp = new Hono().post(
        "/json",
        validatedJson(dummySchema),
        (c) => {
          const body = c.req.valid("json");
          return ok(c, body);
        },
      );

      const res = await testApp.request("/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "valid-input" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as ApiResponse<{ field: string }>;
      expect(body.data?.field).toBe("valid-input");
    });

    it("validatedJson catches invalid payload and formats standard ApiResponse 400", async () => {
      const testApp = new Hono().post(
        "/json",
        validatedJson(dummySchema),
        (c) => ok(c, "success"),
      );

      const res = await testApp.request("/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "no" }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error).toBe("Field too short");
    });

    it("validatedQuery catches invalid query params and formats standard ApiResponse 400", async () => {
      const testApp = new Hono().get(
        "/query",
        validatedQuery(dummySchema),
        (c) => ok(c, c.req.valid("query")),
      );

      const resInvalid = await testApp.request("/query?field=no");
      expect(resInvalid.status).toBe(400);
      const bodyInvalid = (await resInvalid.json()) as ApiResponse<never>;
      expect(bodyInvalid.success).toBe(false);
      expect(bodyInvalid.error).toBe("Field too short");

      const resValid = await testApp.request("/query?field=yes-valid");
      expect(resValid.status).toBe(200);
    });
  });
});
