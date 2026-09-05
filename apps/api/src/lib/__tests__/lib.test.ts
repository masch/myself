import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import type { ApiResponse } from "@myself/shared";
import { buildPaginated } from "../pagination";
import { ok, fail } from "../response";
import { defaultHook } from "../validator";

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

  describe("validator.ts: defaultHook", () => {
    it("returns unified ApiResponse 400 when validation fails", () => {
      const dummyResult = {
        success: false,
        error: {
          issues: [{ message: "Field is invalid" }],
        },
      };
      let jsonPayload: unknown;
      let jsonStatus: number | undefined;
      const fakeContext = {
        json: (payload: unknown, status: number) => {
          jsonPayload = payload;
          jsonStatus = status;
          return new Response(JSON.stringify(payload), { status });
        },
      } as any;

      const res = defaultHook(dummyResult as any, fakeContext);
      expect(res).toBeDefined();
      expect(jsonStatus).toBe(400);
      expect(jsonPayload).toEqual({
        success: false,
        error: "Field is invalid",
        code: "BAD_REQUEST",
      });
    });

    it("falls back to default error message when issues list is empty", () => {
      const dummyResult = {
        success: false,
        error: {
          issues: [],
        },
      };
      let jsonPayload: unknown;
      const fakeContext = {
        json: (payload: unknown, status: number) => {
          jsonPayload = payload;
          return new Response(JSON.stringify(payload), { status });
        },
      } as any;

      defaultHook(dummyResult as any, fakeContext);
      expect(jsonPayload).toEqual({
        success: false,
        error: "Validation failed",
        code: "BAD_REQUEST",
      });
    });

    it("does nothing when validation succeeds", () => {
      const dummyResult = { success: true, data: { ok: true } };
      const fakeContext = {} as any;
      const res = defaultHook(dummyResult as any, fakeContext);
      expect(res).toBeUndefined();
    });
  });
});
