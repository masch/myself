import { describe, expect, it } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { APP_NAME, type ApiResponse } from "@myself/shared";
import type { AppEnv } from "../../types";
import { createSystemRouter } from "../system";
import { registerDocs } from "../../docs";

describe("System Routes & Docs Unit Tests", () => {
  describe("createSystemRouter", () => {
    it("GET / returns welcome message and valid ISO timestamp envelope", async () => {
      const router = createSystemRouter({ environment: "test" });
      const res = await router.request("/");
      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<{
        message: string;
        timestamp: string;
      }>;
      expect(body.success).toBe(true);
      expect(body.data?.message).toBe(`Welcome to ${APP_NAME} API`);
      expect(new Date(body.data?.timestamp ?? "").getTime()).not.toBeNaN();
    });

    it("GET /health returns status ok, computed uptime and configured environment", async () => {
      const startedAt = Date.now() - 5000;
      const router = createSystemRouter({
        environment: "staging",
        startedAt,
      });

      const res = await router.request("/health");
      expect(res.status).toBe(200);

      const body = (await res.json()) as ApiResponse<{
        status: string;
        uptime: number;
        environment: string;
      }>;
      expect(body.success).toBe(true);
      expect(body.data?.status).toBe("ok");
      expect(body.data?.uptime).toBeGreaterThanOrEqual(5);
      expect(body.data?.environment).toBe("staging");
    });
  });

  describe("registerDocs", () => {
    it("GET /doc serves valid OpenAPI 3.1 JSON document", async () => {
      const app = new OpenAPIHono<AppEnv>();
      registerDocs(app);

      const res = await app.request("/doc");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");

      const spec = (await res.json()) as {
        openapi: string;
        info: { title: string };
      };
      expect(spec.openapi).toBe("3.1.0");
      expect(spec.info.title).toBe(`${APP_NAME} API`);
    });

    it("GET /reference serves Scalar HTML documentation", async () => {
      const app = new OpenAPIHono<AppEnv>();
      registerDocs(app);

      const res = await app.request("/reference");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");

      const html = await res.text();
      expect(html).toContain("<!doctype html>");
      expect(html).toContain("Scalar");
    });
  });
});
