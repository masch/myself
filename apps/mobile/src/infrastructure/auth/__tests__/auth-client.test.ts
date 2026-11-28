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

import {
  createAuthApi,
  AUTH_REQUEST_TIMEOUT_MS,
  SESSION_TOKEN_RESPONSE_HEADER,
  type FetchLike,
} from "../auth-client";
import {
  createSessionService,
  describeAuthFailure,
  SESSION_TOKEN_STORAGE_FAILURE,
  type SessionRestore,
} from "../session-service";
import type { SessionTokenStorage } from "../session-token-storage.contract";
import { deriveSessionGate } from "@/context/session-gate";

const AUTH_SECRET = "dGhpcy1pcy1hLXRlc3Qtc2VjcmV0LWZvci10aGUtYXV0aC1jbGllbnQ=";
const BASE_URL = "http://localhost:8787";
/** Better Auth's inherited session lifetime (S25) — recorded, not guessed. */
const EXPECTED_SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

let backendApp: ReturnType<typeof createApp>;
let backendDb: Awaited<ReturnType<typeof createTestDatabase>>;
let scratchDir: string;

/**
 * Awaits `promise`, or reports that it never settled.
 *
 * The deadline test can only fail its expectation by hanging, so the sentinel turns a
 * hang into a readable assertion instead of a runner timeout.
 */
async function settleWithin<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | "never settled"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const sentinel = new Promise<"never settled">((resolve) => {
    timer = setTimeout(() => resolve("never settled"), ms);
  });
  try {
    return await Promise.race([promise, sentinel]);
  } finally {
    clearTimeout(timer);
  }
}

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

  it("persists a token that arrives on a session lookup too", async () => {
    // `getSession` is routed through the same capture as a sign-in: a server that rotates
    // the credential on a lookup must not have that token dropped.
    const { storage, state } = createStorage();
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              session: { id: "session-id", userId: "user-id" },
              user: { id: "user-id", name: "N", email: "n@example.com" },
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
                [SESSION_TOKEN_RESPONSE_HEADER]: "rotated-token",
              },
            },
          ),
        ),
    });

    const result = await api.getSession();

    expect(result.error).toBeNull();
    expect(result.user?.id).toBe("user-id");
    expect(state.token).toBe("rotated-token");
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
  describe("local credential storage failure (T6c m7)", () => {
    /** A store whose write fails the way a locked or unavailable keychain does. */
    function refusingStorage(): SessionTokenStorage {
      return {
        async get() {
          return null;
        },
        async set() {
          throw new Error("OSStatus error -34018: no keychain access");
        },
        async clear() {},
      };
    }

    it("reports a failed keychain write as a local failure, not as an unreachable server", async () => {
      const api = createAuthApi({
        baseUrl: BASE_URL,
        storage: refusingStorage(),
        fetchImpl: inProcessFetch,
      });

      const result = await api.signInEmail({
        email: DEMO_USER_EMAIL,
        password: DEMO_USER_PASSWORD,
      });

      // The server accepted the sign-in; what failed is this device. Reporting `status: 0`
      // here told the user to check a connection that had just worked.
      expect(result.user).toBeNull();
      expect(result.error?.code).toBe(SESSION_TOKEN_STORAGE_FAILURE);
      expect(result.error?.status).toBeUndefined();

      const message = describeAuthFailure(result.error);
      expect(message).toContain("could not save your session");
      expect(message).not.toContain("connection");
      expect(message).not.toContain("reach the server");
    });

    it("reports a failed write only to the call whose response carried the token (R3-001)", async () => {
      // The keychain refuses the first write and accepts the next one, so only the first
      // call has anything to report.
      let writes = 0;
      const state = { token: null as string | null };
      const storage: SessionTokenStorage = {
        async get() {
          return state.token;
        },
        async set(token: string) {
          writes += 1;
          if (writes === 1) {
            throw new Error("OSStatus error -34018: no keychain access");
          }
          state.token = token;
        },
        async clear() {
          state.token = null;
        },
      };

      // Hold the sign-up answer until the sign-in has already reported its own failed
      // write: the interleaving a single shared failure slot cannot survive.
      let releaseSignUp: () => void = () => {};
      const signUpReleased = new Promise<void>((resolve) => {
        releaseSignUp = resolve;
      });
      const fetchImpl: FetchLike = async (input, init) => {
        if (String(input).includes("/sign-up")) await signUpReleased;
        return inProcessFetch(input, init);
      };

      const api = createAuthApi({ baseUrl: BASE_URL, storage, fetchImpl });
      const signUpEmail = `in-flight-${generateEntityId()}@example.com`;

      const signIn = api.signInEmail({
        email: DEMO_USER_EMAIL,
        password: DEMO_USER_PASSWORD,
      });
      // Started while the sign-in is in flight, and answered only after it: this call's
      // response carries its own token, and its own write succeeds.
      const signUp = api.signUpEmail({
        name: "In Flight Person",
        email: signUpEmail,
        password: "a-long-password",
      });

      const signInResult = await signIn;
      // The call that caused the failure still reports it.
      expect(signInResult.user).toBeNull();
      expect(signInResult.error?.code).toBe(SESSION_TOKEN_STORAGE_FAILURE);
      expect(writes).toBe(1);

      releaseSignUp();
      const signUpResult = await signUp;

      // The server answered this call and its write worked; the earlier call's failure is
      // not this call's to report.
      expect(signUpResult.error).toBeNull();
      expect(signUpResult.user?.email).toBe(signUpEmail);
      expect(writes).toBe(2);
      expect(state.token).toBeTruthy();
    });

    it("surfaces the local failure through the session service the screens call", async () => {
      const api = createAuthApi({
        baseUrl: BASE_URL,
        storage: refusingStorage(),
        fetchImpl: inProcessFetch,
      });
      const service = createSessionService({ api, storage: refusingStorage() });

      const failure = await service
        .signIn({ email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toContain(
        "could not save your session",
      );
    });
  });
});

describe("Google ID token exchange through the auth client (S4)", () => {
  /** One request the client made, with the body it sent. */
  interface SeenRequest {
    path: string;
    body: unknown;
  }

  /** Answers `signIn.social` the way the API does when it accepts the ID token. */
  function acceptingFetch(seen: SeenRequest[]): FetchLike {
    return (input, init) => {
      seen.push({
        path: new URL(String(input)).pathname,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return Promise.resolve(
        new Response(
          JSON.stringify({
            redirect: false,
            token: "session-token",
            user: {
              id: "google-user-id",
              name: "Ada Lovelace",
              email: "ada@example.com",
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              [SESSION_TOKEN_RESPONSE_HEADER]: "session-token",
            },
          },
        ),
      );
    };
  }

  it("posts the ID token to the social sign-in route and keeps the session credential", async () => {
    const seen: SeenRequest[] = [];
    const { storage, state } = createStorage();
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: acceptingFetch(seen),
    });

    const result = await api.signInWithGoogle("google-id-token-1");

    // The route and the body are the ones the API already accepts (proven against a
    // mocked IdP in apps/api): no redirect, no browser, just the token.
    expect(seen).toEqual([
      {
        path: "/api/auth/sign-in/social",
        body: { provider: "google", idToken: { token: "google-id-token-1" } },
      },
    ]);
    expect(result.error).toBeNull();
    expect(result.user).toEqual({
      id: "google-user-id",
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: null,
    });
    // The same header capture the password sign-in uses: one credential path, not two.
    expect(state.token).toBe("session-token");
  });

  it("keeps no credential when the server refuses to link the account", async () => {
    const { storage, state } = createStorage();
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              code: "OAUTH_LINK_ERROR",
              message: "account not linked",
            }),
            { status: 401, headers: { "content-type": "application/json" } },
          ),
        ),
    });

    const result = await api.signInWithGoogle("google-id-token-2");

    expect(result.user).toBeNull();
    expect(result.error).toMatchObject({
      code: "OAUTH_LINK_ERROR",
      message: "account not linked",
    });
    expect(state.token).toBeNull();
  });

  it("still sends an email sign-in to the email route with the email and the password", async () => {
    // The social path is additive: the request a password sign-in produces is unchanged.
    const seen: SeenRequest[] = [];
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage: createStorage().storage,
      fetchImpl: acceptingFetch(seen),
    });

    await api.signInEmail({
      email: "ada@example.com",
      password: "a-long-password",
    });

    expect(seen).toEqual([
      {
        path: "/api/auth/sign-in/email",
        body: { email: "ada@example.com", password: "a-long-password" },
      },
    ]);
  });
});

describe("restore behaviour end to end (T6c M1, M2)", () => {
  /** The gate state the provider derives from one restore outcome. */
  function gateFor(outcome: SessionRestore) {
    if (outcome.status === "authenticated") {
      return deriveSessionGate({ isLoading: false, user: outcome.user });
    }
    if (outcome.status === "unavailable") {
      return deriveSessionGate({
        isLoading: false,
        user: null,
        restoreProblem: { reason: outcome.reason, message: outcome.message },
      });
    }
    return deriveSessionGate({ isLoading: false, user: null });
  }

  it("keeps the stored token and lands on the retry state when the server is unreachable", async () => {
    const { storage, state } = createStorage("stored-token");
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: () => Promise.reject(new Error("Network request failed")),
    });
    const service = createSessionService({ api, storage });

    const outcome = await service.restore();

    expect(outcome).toMatchObject({ status: "unavailable", reason: "offline" });
    expect(gateFor(outcome)).toBe("unavailable");
    expect(state.token).toBe("stored-token");
  });

  it("clears the token and lands on sign-in when the server rejects the credential", async () => {
    // The one case that must sign the user out, driven through the real API: a stored
    // credential the server no longer accepts.
    const { storage, state } = createStorage("not-a-real-session-token");
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: inProcessFetch,
    });
    const service = createSessionService({ api, storage });

    const outcome = await service.restore();

    expect(outcome).toEqual({ status: "unauthenticated" });
    expect(gateFor(outcome)).toBe("unauthenticated");
    expect(state.token).toBeNull();
  });

  it("ends in the retry state instead of hanging when the restore outlives its deadline", async () => {
    const { storage, state } = createStorage("stored-token");
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      // Ignores the abort on purpose: the client-level deadline cannot save this one, so
      // only the service deadline can end the launch.
      fetchImpl: () => new Promise<Response>(() => {}),
      requestTimeoutMs: 10,
    });
    const service = createSessionService({
      api,
      storage,
      restoreDeadlineMs: 30,
    });

    const settled = await settleWithin(service.restore(), 1000);
    expect(settled).not.toBe("never settled");
    const outcome = settled as SessionRestore;

    expect(outcome).toMatchObject({ status: "unavailable", reason: "timeout" });
    expect(gateFor(outcome)).toBe("unavailable");
    expect(state.token).toBe("stored-token");
  });
});

describe("auth client request deadline (T6c M1)", () => {
  /**
   * A transport that never answers on its own and only rejects when it is aborted, which
   * is the failure a connection that swallows packets produces.
   */
  function hangingFetch(onAbort: () => void): FetchLike {
    return (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          onAbort();
          const error = new Error("The operation was aborted.");
          error.name = "AbortError";
          reject(error);
        });
      });
  }

  it("aborts a hanging request at its own deadline instead of waiting forever", async () => {
    let aborted = false;
    const { storage } = createStorage();
    const api = createAuthApi({
      baseUrl: BASE_URL,
      storage,
      fetchImpl: hangingFetch(() => {
        aborted = true;
      }),
      requestTimeoutMs: 20,
    });

    const result = await settleWithin(api.getSession(), 1000);

    expect(aborted).toBe(true);
    expect(result).not.toBe("never settled");
    expect(result).toMatchObject({ user: null, error: { status: 0 } });
  });

  it("uses the same 10-second budget as the app's HTTP client by default", () => {
    expect(AUTH_REQUEST_TIMEOUT_MS).toBe(10_000);
  });
});
