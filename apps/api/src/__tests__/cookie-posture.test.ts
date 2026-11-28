import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../app";
import { AppConfig } from "../config";
import { seedFromConfig } from "../infrastructure/persistence/seed";

/**
 * The session cookie as the browser receives it (S2).
 *
 * Every other cookie assertion reads the auth instance's resolved attributes, which is
 * the policy a person configured. This file reads the `Set-Cookie` header itself, because
 * the wire is where the browser decides: the library adds its own floor (`Secure` whenever
 * the cookie carries the `__Secure-` prefix) and a browser silently drops
 * `SameSite=None` without `Secure`, which is a session that stops working with no error
 * anywhere. The third case is the one that matters most in practice — opting in to
 * cross-site is only safe while the origin allowlist keeps refusing everyone else.
 */

const AUTH_SECRET = "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci1jb29raWUtcG9zdHVyZQ==";
const WEB_ORIGIN = "https://app.example.com";
const FOREIGN_ORIGIN = "https://evil.example.net";

const scratch = mkdtempSync(join(tmpdir(), "myself-cookie-posture-"));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

let sequence = 0;

/**
 * One sign-up against a real app built from these bindings, returning the raw response.
 *
 * The sign-up is used only because it is the cheapest request that answers with a session
 * cookie; nothing here asserts anything about registration.
 */
async function signUp(
  label: string,
  bindings: Record<string, string>,
  origin: string = WEB_ORIGIN,
): Promise<Response> {
  sequence += 1;
  const url = `file:${join(scratch, `${label}-${sequence}.db`)}`;
  const config = AppConfig.from({
    TURSO_DATABASE_URL: url,
    AUTH_SECRET,
    ...bindings,
  });
  // Migrations and the seed are what `createApp` expects to find already done; the app
  // then builds its own repositories from the same config.
  await seedFromConfig(config);
  const app = createApp(config);

  return app.request(
    new Request("http://localhost/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({
        email: `${label}@example.com`,
        password: "a-long-enough-password",
        name: "Cookie Posture",
      }),
    }),
  );
}

/** The raw `Set-Cookie` values, which the DOM `Headers` type does not declare. */
function setCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie(): string[] };
  return headers.getSetCookie();
}

function sessionCookie(response: Response): string {
  const cookie = setCookies(response).find((value) =>
    value.includes("session_token"),
  );
  expect(cookie).toBeDefined();
  return cookie!;
}

describe("session cookie on the wire (S2)", () => {
  it("keeps SameSite=Lax and drops the Secure flag locally", async () => {
    // The allowlist fails closed with no value, which is its own case elsewhere; a local
    // origin is what a developer's browser sends.
    const response = await signUp(
      "local",
      {
        ENVIRONMENT: "development",
        CORS_ALLOWED_ORIGINS: "http://localhost:8081",
      },
      "http://localhost:8081",
    );

    expect(response.status).toBe(200);
    const cookie = sessionCookie(response);
    expect(cookie).toContain("SameSite=Lax");
    // A script-readable session cookie is what S22 forbids outright.
    expect(cookie).toContain("HttpOnly");
    // Over http://localhost a Secure cookie would never come back.
    expect(cookie).not.toContain("Secure");
  });

  it("sends SameSite=None only together with Secure", async () => {
    const response = await signUp("cross-site", {
      ENVIRONMENT: "production",
      AUTH_URL: "https://api.example.com",
      CORS_ALLOWED_ORIGINS: WEB_ORIGIN,
      AUTH_COOKIE_SAME_SITE: "none",
    });

    expect(response.status).toBe(200);
    const cookie = sessionCookie(response);
    expect(cookie).toContain("SameSite=None");
    expect(cookie).toContain("Secure");
  });

  it("refuses a foreign browser origin with no cookie at all, even when None is chosen", async () => {
    const response = await signUp(
      "foreign-origin",
      {
        ENVIRONMENT: "production",
        AUTH_URL: "https://api.example.com",
        CORS_ALLOWED_ORIGINS: WEB_ORIGIN,
        AUTH_COOKIE_SAME_SITE: "none",
      },
      FOREIGN_ORIGIN,
    );

    // Cross-site is only safe while the allowlist keeps refusing everyone else, so this
    // case is the guard behind the opt-in rather than a detail of it.
    expect(response.status).toBe(403);
    expect(setCookies(response)).toEqual([]);
  });
});
