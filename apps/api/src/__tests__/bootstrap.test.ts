import { describe, expect, it } from "bun:test";
import { AppConfig, getProcessEnv } from "../config";
import { createApp } from "../app";
import { seedFromConfig } from "../db/seed";
import entrypoint, { getDefaultApp, resolveRuntimeEnv } from "../index";

import { existsSync, rmSync } from "node:fs";

describe("Application Bootstrap & Entrypoint Unit Tests", () => {
  describe("createApp default dependencies", () => {
    it("instantiates app using default repositories provider from config", async () => {
      const dbPath = "bootstrap-test.db";
      const config = AppConfig.from({
        ENVIRONMENT: "test",
        TURSO_DATABASE_URL: `file:${dbPath}`,
      });
      try {
        await seedFromConfig(config);
        const app = createApp(config);
        const res = await app.request("/v1/authors");
        expect(res.status).toBe(200);
      } finally {
        if (existsSync(dbPath)) {
          rmSync(dbPath);
        }
      }
    });
  });

  describe("resolveRuntimeEnv", () => {
    it("returns env when TURSO_DATABASE_URL is provided", () => {
      const env = { TURSO_DATABASE_URL: "libsql://test.turso.io" };
      expect(resolveRuntimeEnv(env)).toBe(env);
    });

    it("falls back to getProcessEnv when env is undefined or missing database url", () => {
      expect(resolveRuntimeEnv(undefined)).toEqual(getProcessEnv() as any);
      expect(resolveRuntimeEnv({})).toEqual(getProcessEnv() as any);
    });
  });

  describe("getDefaultApp & worker runtime entrypoint", () => {
    it("initializes and caches defaultApp via runtime env bindings", () => {
      const app1 = getDefaultApp({
        ENVIRONMENT: "test",
        TURSO_DATABASE_URL: ":memory:",
      });
      const app2 = getDefaultApp();
      expect(app1).toBe(app2);
    });

    it("entrypoint.fetch delegates to app and responds to HTTP requests with env bindings", async () => {
      const request = new Request("http://localhost/health");
      const res = await entrypoint.fetch(request, {
        ENVIRONMENT: "staging",
        TURSO_DATABASE_URL: ":memory:",
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        status: string;
        environment: string;
      };
      expect(body.status).toBe("ok");
    });

    it("entrypoint.fetch uses process.env when env parameter has no TURSO_DATABASE_URL", async () => {
      const originalEnv = process.env.ENVIRONMENT;
      const originalUrl = process.env.TURSO_DATABASE_URL;

      process.env.ENVIRONMENT = "test";
      process.env.TURSO_DATABASE_URL = ":memory:";

      try {
        const request = new Request("http://localhost/health");
        const res = await entrypoint.fetch(request);
        expect(res.status).toBe(200);
      } finally {
        process.env.ENVIRONMENT = originalEnv;
        process.env.TURSO_DATABASE_URL = originalUrl;
      }
    });

    it("entrypoint has configured port number", () => {
      expect(typeof entrypoint.port).toBe("number");
      expect(entrypoint.port).toBeGreaterThan(0);
    });
  });
});
