import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ErrorCode, DEMO_USER_EMAIL } from "@myself/shared";
import { createApp } from "../app";
import { AppConfig, resolveCorsConfig } from "../config";
import {
  createTestRepositories,
  DEMO_USER_PASSWORD,
} from "../infrastructure/persistence/test-db";

/**
 * The CORS posture (S15, S22, S26).
 *
 * It stopped being hygiene when the web target arrived: the browser session is a
 * cookie, so the response must be readable with credentials and the allowlist must never
 * be a wildcard. Two behaviours are pinned here — the allowlisted origin gets the headers
 * it needs (`Access-Control-Allow-Credentials` and the exposed `set-auth-token`), and an
 * origin that is not on the list is refused by this API with the project's own envelope
 * instead of quietly reaching the route.
 */
const ALLOWED_ORIGIN = "http://localhost:8082";
const SECOND_ALLOWED_ORIGIN = "https://myself.example.com";
const DISALLOWED_ORIGIN = "https://evil.example.com";

let scratchDir: string;
let app: ReturnType<typeof createApp>;

function buildApp() {
  const url = `file:${join(scratchDir, "cors.db")}`;
  const config = AppConfig.from({
    ENVIRONMENT: "test",
    TURSO_DATABASE_URL: url,
    AUTH_SECRET: "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci1jb3Jz",
    CORS_ALLOWED_ORIGINS: `${ALLOWED_ORIGIN}, ${SECOND_ALLOWED_ORIGIN}`,
  });
  return { config, url };
}

beforeAll(async () => {
  scratchDir = mkdtempSync(join(tmpdir(), "myself-api-cors-"));
  const { config, url } = buildApp();
  const repositories = await createTestRepositories({ seed: true, url });
  app = createApp(config, repositories);
});

afterAll(() => {
  if (scratchDir) rmSync(scratchDir, { recursive: true, force: true });
});

function exposedHeaders(response: Response): string[] {
  return (response.headers.get("access-control-expose-headers") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

describe("CORS allowlist (S15, S22, S26)", () => {
  describe("an allowlisted origin", () => {
    it("reads /v1 with credentials and the auth header exposed", async () => {
      const response = await app.fetch(
        new Request("http://localhost/v1/readings?limit=1", {
          headers: { Origin: ALLOWED_ORIGIN },
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe(
        ALLOWED_ORIGIN,
      );
      expect(response.headers.get("access-control-allow-credentials")).toBe(
        "true",
      );
      expect(exposedHeaders(response)).toContain("set-auth-token");
      // A wildcard must never appear, with or without credentials.
      expect(response.headers.get("access-control-allow-origin")).not.toBe("*");
    });

    it("signs in over /api/auth with a readable set-auth-token and the cookie", async () => {
      const response = await app.fetch(
        new Request("http://localhost/api/auth/sign-in/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: ALLOWED_ORIGIN,
          },
          body: JSON.stringify({
            email: DEMO_USER_EMAIL,
            password: DEMO_USER_PASSWORD,
          }),
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe(
        ALLOWED_ORIGIN,
      );
      expect(response.headers.get("access-control-allow-credentials")).toBe(
        "true",
      );
      // Both transports are usable: the header is exposed to script, and the cookie
      // is set for the browser's own jar.
      expect(response.headers.get("set-auth-token")).toBeTruthy();
      expect(exposedHeaders(response)).toContain("set-auth-token");
      expect(response.headers.get("set-cookie")).toContain("=");
    });

    it("answers the preflight for a JSON auth request", async () => {
      const response = await app.fetch(
        new Request("http://localhost/api/auth/sign-in/email", {
          method: "OPTIONS",
          headers: {
            Origin: ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
          },
        }),
      );

      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe(
        ALLOWED_ORIGIN,
      );
      expect(response.headers.get("access-control-allow-credentials")).toBe(
        "true",
      );
      expect(
        (
          response.headers.get("access-control-allow-methods") ?? ""
        ).toUpperCase(),
      ).toContain("POST");
    });
  });

  describe("an origin that is not on the list", () => {
    it("is refused on /v1 with the project envelope and no CORS grant", async () => {
      const response = await app.fetch(
        new Request("http://localhost/v1/readings?limit=1", {
          headers: { Origin: DISALLOWED_ORIGIN },
        }),
      );

      expect(response.status).toBe(403);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
      expect(
        response.headers.get("access-control-allow-credentials"),
      ).toBeNull();
      expect((await response.json()) as unknown).toEqual({
        error:
          "Origin not allowed: CORS_ALLOWED_ORIGINS does not list this origin",
        code: ErrorCode.FORBIDDEN,
      });
    });

    it("is refused on /api/auth before Better Auth sees the request", async () => {
      const response = await app.fetch(
        new Request("http://localhost/api/auth/sign-in/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: DISALLOWED_ORIGIN,
          },
          body: JSON.stringify({
            email: DEMO_USER_EMAIL,
            password: DEMO_USER_PASSWORD,
          }),
        }),
      );

      expect(response.status).toBe(403);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
      expect((await response.json()) as unknown).toEqual({
        error:
          "Origin not allowed: CORS_ALLOWED_ORIGINS does not list this origin",
        code: ErrorCode.FORBIDDEN,
      });
    });
  });

  describe("a client that sends no Origin at all", () => {
    it("is still served, because native and CLI clients have no origin", async () => {
      const response = await app.fetch(
        new Request("http://localhost/v1/readings?limit=1"),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    });
  });
});

describe("resolveCorsConfig", () => {
  it("reads a comma-separated list, trimmed, with no wildcard anywhere", () => {
    expect(
      resolveCorsConfig(`${ALLOWED_ORIGIN}, ${SECOND_ALLOWED_ORIGIN}`)
        .allowedOrigins,
    ).toEqual([ALLOWED_ORIGIN, SECOND_ALLOWED_ORIGIN]);
    expect(resolveCorsConfig(`${ALLOWED_ORIGIN},,  `).allowedOrigins).toEqual([
      ALLOWED_ORIGIN,
    ]);
    expect(resolveCorsConfig(undefined).allowedOrigins).toEqual([]);
    expect(resolveCorsConfig("   ").allowedOrigins).toEqual([]);
  });

  it("refuses a wildcard, because credentials and * cannot coexist", () => {
    expect(() => resolveCorsConfig("*")).toThrow(/wildcard/i);
    expect(() => resolveCorsConfig(`${ALLOWED_ORIGIN},*`)).toThrow(/wildcard/i);
  });

  it("refuses an entry that is not an origin", () => {
    expect(() => resolveCorsConfig("localhost:8082")).toThrow(/origin/i);
    expect(() => resolveCorsConfig("http://localhost:8082/path")).toThrow(
      /origin/i,
    );
  });
});
