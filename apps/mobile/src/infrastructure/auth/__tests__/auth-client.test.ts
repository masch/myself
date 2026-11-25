import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { desc, eq } from "drizzle-orm";
import { DEMO_USER_EMAIL, generateEntityId, session } from "@myself/shared";
import { createApp } from "@myself/api/src/app";
import { AppConfig } from "@myself/api/src/config";
import {
  createTestDatabase,
  DEMO_USER_PASSWORD,
} from "@myself/api/src/infrastructure/persistence/test-db";

import { createAuthApi } from "../auth-client";
import { createSessionService } from "../session-service";
import type { SessionTokenStorage } from "../session-token-storage.contract";

const AUTH_SECRET = "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci10aGUtYXV0aC1jbGllbnQ=";
const BASE_URL = "http://localhost:8787";
/** Better Auth's inherited session lifetime (S25) — recorded, not guessed. */
const EXPECTED_SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

let backendApp: ReturnType<typeof createApp>;
let backendDb: Awaited<ReturnType<typeof createTestDatabase>>;
let scratchDir: string;

function createStorage(initial: string | null = null) {
  const state = { token: initial };
  const storage: SessionTokenStorage = {
    async get() {
      return state.token;
    },
    async set(token: string) {
      state.token = token;
    },
    async clear() {
      state.token = null;
    },
  };
  return { storage, state };
}

/**
 * Routes the auth client's fetch through the real Hono app in-process.
 *
 * There is no cookie jar here on purpose: the only credential that can survive a
 * round trip is the `set-auth-token` header captured into storage and sent back as
 * `Authorization: Bearer`, so the transport is what these tests prove.
 */
function inProcessFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return Promise.resolve(backendApp.fetch(new Request(String(input), init)));
}

describe("auth client over the real API (S8 bearer transport)", () => {
  beforeAll(async () => {
    scratchDir = mkdtempSync(join(tmpdir(), "myself-auth-client-"));
    const url = `file:${join(scratchDir, "backend.db")}`;

    const config = AppConfig.from({
      ENVIRONMENT: "test",
      TURSO_DATABASE_URL: url,
      AUTH_SECRET,
      AUTH_URL: BASE_URL,
    });
    // One throwaway database for the auth instance and the repositories, plus the
    // handle this suite reads the session row through (S25).
    backendDb = await createTestDatabase({ seed: true, url });
    backendApp = createApp(config);
  });

  afterAll(() => {
    if (scratchDir) rmSync(scratchDir, { recursive: true, force: true });
  });

  it("captures the set-auth-token header of a password sign-in into token storage", async () => {
    const { storage, state } = createStorage();
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: inProcessFetch,
    });

    const result = await api.signInEmail({
      email: DEMO_USER_EMAIL,
      password: DEMO_USER_PASSWORD,
    });

    expect(result.error).toBeNull();
    expect(result.user?.email).toBe(DEMO_USER_EMAIL);
    expect(state.token).toBeTruthy();
    expect(state.token).not.toBe("");
  });

  it("resolves the session with the captured token and nothing else", async () => {
    const { storage } = createStorage();
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: inProcessFetch,
    });

    await api.signInEmail({
      email: DEMO_USER_EMAIL,
      password: DEMO_USER_PASSWORD,
    });
    const session = await api.getSession();

    expect(session.user?.email).toBe(DEMO_USER_EMAIL);
    expect(session.user?.role).toBe("user");
  });

  it("reports a wrong password without storing a token", async () => {
    const { storage, state } = createStorage();
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: inProcessFetch,
    });

    const result = await api.signInEmail({
      email: DEMO_USER_EMAIL,
      password: `${DEMO_USER_PASSWORD}-wrong`,
    });

    expect(result.user).toBeNull();
    expect(result.error?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(state.token).toBeNull();
  });

  it("signs a new account up, stores its token and keeps the default role", async () => {
    const { storage, state } = createStorage();
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: inProcessFetch,
    });
    const email = `new-${generateEntityId()}@example.com`;

    const result = await api.signUpEmail({
      name: "New Person",
      email,
      password: "a-long-password",
    });

    expect(result.error).toBeNull();
    expect(result.user?.email).toBe(email);
    expect(result.user?.role).toBe("user");
    expect(state.token).toBeTruthy();
  });

  it("signs out through the API and the client service forgets the token", async () => {
    const { storage, state } = createStorage();
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: inProcessFetch,
    });
    const service = createSessionService({ api, storage });

    await service.signIn({
      email: DEMO_USER_EMAIL,
      password: DEMO_USER_PASSWORD,
    });
    expect(state.token).toBeTruthy();

    await service.signOut();

    expect(state.token).toBeNull();
    expect((await api.getSession()).user).toBeNull();
  });

  it("hands out a session whose lifetime is the recorded 7 days (S25)", async () => {
    const { storage } = createStorage();
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: inProcessFetch,
    });

    const result = await api.signUpEmail({
      name: "Lifetime Person",
      email: `lifetime-${generateEntityId()}@example.com`,
      password: "a-long-password",
    });

    const [row] = await backendDb
      .select({
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      })
      .from(session)
      .where(eq(session.userId, result.user!.id))
      .orderBy(desc(session.createdAt))
      .limit(1);

    expect(row).toBeDefined();
    expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBe(
      EXPECTED_SESSION_LIFETIME_MS,
    );
  });
});
