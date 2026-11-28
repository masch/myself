import { describe, expect, it } from "bun:test";
import {
  AuthenticationError,
  createSessionService,
  describeAuthFailure,
  mapSessionUser,
  type AuthApiPort,
  type AuthResult,
  type SessionUser,
} from "../session-service";
import type { SessionTokenStorage } from "../session-token-storage.contract";

const USER: SessionUser = {
  id: "e0000000-0000-4000-8000-000000000001",
  name: "My self",
  email: "myself@example.com",
  role: "user",
};

/** The message the user sees for a server that never answered (T6c `M2`). */
const UNREACHABLE_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

/**
 * Awaits `promise`, or reports that it never settled.
 *
 * The deadline tests can only fail their expectation by hanging, so the sentinel turns a
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

function createStorage(
  initial: string | null = null,
  capability: { endsSessionOnClear?: boolean } = {},
) {
  const state = { token: initial, clears: 0, sets: [] as string[] };
  const storage: SessionTokenStorage = {
    ...capability,
    async get() {
      return state.token;
    },
    async set(token: string) {
      state.token = token;
      state.sets.push(token);
    },
    async clear() {
      state.token = null;
      state.clears += 1;
    },
  };
  return { storage, state };
}

function createApi(overrides: Partial<AuthApiPort> = {}) {
  const calls: string[] = [];
  const api: AuthApiPort = {
    async signInEmail() {
      calls.push("signInEmail");
      return { user: USER, error: null } satisfies AuthResult;
    },
    async signUpEmail() {
      calls.push("signUpEmail");
      return { user: USER, error: null } satisfies AuthResult;
    },
    async getSession() {
      calls.push("getSession");
      return { user: USER, error: null } satisfies AuthResult;
    },
    async signOut() {
      calls.push("signOut");
    },
    ...overrides,
  };
  return { api, calls };
}

describe("createSessionService", () => {
  describe("signIn / signUp", () => {
    it("returns the session user on success and leaves the stored token alone", async () => {
      const { api } = createApi();
      const { storage, state } = createStorage("token-from-client");
      const service = createSessionService({ api, storage });

      const user = await service.signIn({
        email: "myself@example.com",
        password: "demo-password",
      });

      expect(user).toEqual(USER);
      expect(state.clears).toBe(0);
      expect(await storage.get()).toBe("token-from-client");
    });

    it("rejects with a mapped AuthenticationError and stores no token on a wrong password", async () => {
      const { api } = createApi({
        async signInEmail() {
          return {
            user: null,
            error: { code: "INVALID_EMAIL_OR_PASSWORD", status: 401 },
          };
        },
      });
      const { storage, state } = createStorage();
      const service = createSessionService({ api, storage });

      const failure = await service
        .signIn({ email: "myself@example.com", password: "wrong" })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(AuthenticationError);
      expect((failure as Error).message).toBe(
        "Email or password is incorrect.",
      );
      expect(state.sets).toEqual([]);
      expect(await storage.get()).toBeNull();
    });

    it("rejects a sign-up whose email already exists with a message about the account", async () => {
      const { api } = createApi({
        async signUpEmail() {
          return {
            user: null,
            error: { code: "USER_ALREADY_EXISTS", status: 422 },
          };
        },
      });
      const { storage } = createStorage();
      const service = createSessionService({ api, storage });

      const failure = await service
        .signUp({
          name: "New Person",
          email: "taken@example.com",
          password: "a-long-password",
        })
        .catch((error: unknown) => error);

      expect((failure as Error).message).toBe(
        "An account with this email already exists.",
      );
    });
  });

  describe("restore", () => {
    it("returns the user the server reports for the stored session", async () => {
      const { api, calls } = createApi();
      const { storage, state } = createStorage("token-abc");
      const service = createSessionService({ api, storage });

      expect(await service.restore()).toEqual({
        status: "authenticated",
        user: USER,
      });
      expect(calls).toContain("getSession");
      expect(state.clears).toBe(0);
    });

    it("clears a token the server rejects, so a dead session is not kept", async () => {
      const { api } = createApi({
        async getSession() {
          return { user: null, error: { status: 401 } };
        },
      });
      const { storage, state } = createStorage("expired-token");
      const service = createSessionService({ api, storage });

      expect(await service.restore()).toEqual({ status: "unauthenticated" });
      expect(state.clears).toBe(1);
      expect(await storage.get()).toBeNull();
    });

    it("clears a token whose session the server reports as expired", async () => {
      const { api } = createApi({
        async getSession() {
          return {
            user: null,
            error: { code: "SESSION_EXPIRED", status: 403 },
          };
        },
      });
      const { storage, state } = createStorage("expired-token");
      const service = createSessionService({ api, storage });

      expect(await service.restore()).toEqual({ status: "unauthenticated" });
      expect(state.clears).toBe(1);
    });

    it("clears the token when the server answers with no session at all", async () => {
      const { api } = createApi({
        async getSession() {
          return { user: null, error: null };
        },
      });
      const { storage, state } = createStorage("stale-token");
      const service = createSessionService({ api, storage });

      expect(await service.restore()).toEqual({ status: "unauthenticated" });
      expect(state.clears).toBe(1);
    });

    it("keeps the token and reports the offline state for the result the client really produces", async () => {
      // The production shape: `auth-client.ts` turns every transport throw into this
      // result, so this — not a throwing `getSession` — is the branch that runs when the
      // server is unreachable (T6c `M2`).
      const { api } = createApi({
        async getSession() {
          return {
            user: null,
            error: { status: 0, message: "Failed to fetch" },
          };
        },
      });
      const { storage, state } = createStorage("still-valid-token");
      const service = createSessionService({ api, storage });

      expect(await service.restore()).toEqual({
        status: "unavailable",
        reason: "offline",
        message: UNREACHABLE_MESSAGE,
      });
      expect(state.clears).toBe(0);
      expect(await storage.get()).toBe("still-valid-token");
    });

    it("keeps the token when the call itself throws, and still reports the offline state", async () => {
      // Defensive: the client converts every throw into the status-0 result above, so this
      // path is kept only so a port that does throw cannot be read as "signed out".
      const { api } = createApi({
        async getSession() {
          throw new Error("fetch failed");
        },
      });
      const { storage, state } = createStorage("still-valid-token");
      const service = createSessionService({ api, storage });

      expect(await service.restore()).toEqual({
        status: "unavailable",
        reason: "offline",
        message: UNREACHABLE_MESSAGE,
      });
      expect(state.clears).toBe(0);
      expect(await storage.get()).toBe("still-valid-token");
    });

    it("keeps the token when the server answers with a failure that judged no credential", async () => {
      const { api } = createApi({
        async getSession() {
          return {
            user: null,
            error: { status: 500, message: "Internal Server Error" },
          };
        },
      });
      const { storage, state } = createStorage("still-valid-token");
      const service = createSessionService({ api, storage });

      expect(await service.restore()).toEqual({
        status: "unavailable",
        reason: "server-error",
        message: "Internal Server Error",
      });
      expect(state.clears).toBe(0);
    });

    it("ends in the retryable state instead of hanging when the restore outlives its deadline", async () => {
      // A connection that swallows packets never settles the promise; before T6c `M1`
      // that was an unrecoverable launch screen.
      const { api } = createApi({
        getSession() {
          return new Promise<AuthResult>(() => {});
        },
      });
      const { storage, state } = createStorage("still-valid-token");
      const service = createSessionService({
        api,
        storage,
        restoreDeadlineMs: 20,
      });

      const outcome = await settleWithin(service.restore(), 1000);

      expect(outcome).toEqual({
        status: "unavailable",
        reason: "timeout",
        message:
          "The server did not answer in time. Check your connection and try again.",
      });
      expect(state.clears).toBe(0);
      expect(await storage.get()).toBe("still-valid-token");
    });
  });

  describe("signOut", () => {
    it("clears the stored token and revokes the server session", async () => {
      const { api, calls } = createApi();
      const { storage, state } = createStorage("token-abc");
      const service = createSessionService({ api, storage });

      await service.signOut();

      expect(calls).toContain("signOut");
      expect(state.clears).toBe(1);
      expect(await storage.get()).toBeNull();
    });

    it("clears the local credential before it asks the server to revoke anything", async () => {
      const { storage, state } = createStorage("token-abc");
      const seenByServer: (string | null)[] = [];
      const { api } = createApi({
        async signOut() {
          seenByServer.push(await storage.get());
        },
      });
      const service = createSessionService({ api, storage });

      await service.signOut();
      // A revoke that is not awaited needs one turn before it observes the store.
      await new Promise((resolve) => setTimeout(resolve, 0));

      // The local decision is already made when the request leaves (T6c `m2`): an
      // interruption between the two can no longer leave a live token behind.
      expect(seenByServer).toEqual([null]);
      expect(state.clears).toBe(1);
    });

    it("does not leave the device signed in when the revoke never answers", async () => {
      const { api } = createApi({
        async signOut() {
          return new Promise<void>(() => {});
        },
      });
      const { storage, state } = createStorage("token-abc");
      const service = createSessionService({
        api,
        storage,
        revokeDeadlineMs: 20,
      });

      const settled = await settleWithin(service.signOut(), 1000);

      expect(settled).not.toBe("never settled");
      expect(state.clears).toBe(1);
      expect(await storage.get()).toBeNull();
    });

    it("still clears the stored token when the server call fails", async () => {
      const { api } = createApi({
        async signOut() {
          throw new Error("fetch failed");
        },
      });
      const { storage, state } = createStorage("token-abc");
      const service = createSessionService({ api, storage });

      await service.signOut();
      expect(state.clears).toBe(1);
      expect(await storage.get()).toBeNull();
    });

    /**
     * The server half is reported, not swallowed (T2, S3).
     *
     * The revoke used to be best-effort and silent: a session the server still held came
     * back to the caller as a completed sign-out. On the web the cookie is the session and
     * no local code can clear it, so that silence is what kept a live session alive behind
     * a "signed out" screen.
     */
    it("reports that the server ended the session", async () => {
      const { api, calls } = createApi();
      const { storage } = createStorage("token-abc");
      const service = createSessionService({ api, storage });

      expect(await service.signOut()).toEqual({ revoke: "revoked" });
      expect(calls).toContain("signOut");
    });

    it("reports an unreachable server with the failure it threw", async () => {
      const failure = new Error("fetch failed");
      const { api } = createApi({
        async signOut() {
          throw failure;
        },
      });
      const { storage, state } = createStorage("token-abc");
      const service = createSessionService({ api, storage });

      // The local clear still happened, so the device no longer holds the credential; what
      // did not happen is the revoke, and the reason travels with the answer.
      expect(await service.signOut()).toEqual({
        revoke: "unreachable",
        revokeError: failure,
      });
      expect(state.clears).toBe(1);
      expect(await storage.get()).toBeNull();
    });

    it("reports a revoke that outlived its deadline as unreachable", async () => {
      const { api } = createApi({
        async signOut() {
          return new Promise<void>(() => {});
        },
      });
      const { storage } = createStorage("token-abc");
      const service = createSessionService({
        api,
        storage,
        revokeDeadlineMs: 20,
      });

      const outcome = await settleWithin(service.signOut(), 1000);

      expect(outcome).not.toBe("never settled");
      if (outcome === "never settled" || !outcome) {
        throw new Error("signOut never reported what the server did");
      }
      expect(outcome.revoke).toBe("unreachable");
      expect((outcome.revokeError as Error).message).toBe(
        "The sign-out request was not answered in time.",
      );
    });
  });
});

/**
 * The store's answer travels with the revoke (T2 follow-up, S3).
 *
 * Whether the identity may stay after a revoke that never arrived is a fact about the
 * store: on the web the browser owns the cookie and nothing local ended it, on native the
 * cleared token was the only proof. The service does not decide that — it carries the
 * store's own answer, so no caller has to guess it from the platform.
 *
 * The service is tested here without a platform at all, so the answer is a plain fact:
 * the store declares it or it does not.
 */
describe("signOut and the store's answer about the session (S3)", () => {
  const failure = new Error("fetch failed");

  it("carries a store that says clearing the token does not end the session", async () => {
    const { api } = createApi({
      async signOut() {
        throw failure;
      },
    });
    const { storage } = createStorage("token-abc", {
      endsSessionOnClear: false,
    });
    const service = createSessionService({ api, storage });

    expect(await service.signOut()).toEqual({
      revoke: "unreachable",
      revokeError: failure,
      endsSessionOnClear: false,
    });
  });

  it("carries a store that says clearing the token ends the session, on a completed revoke too", async () => {
    const { api } = createApi();
    const { storage } = createStorage("token-abc", {
      endsSessionOnClear: true,
    });
    const service = createSessionService({ api, storage });

    // The answer is a property of the store, not of this attempt: it travels with a
    // revoke that reached the server just as it does with one that did not.
    expect(await service.signOut()).toEqual({
      revoke: "revoked",
      endsSessionOnClear: true,
    });
  });

  it("reports no answer at all when the store does not declare one", async () => {
    const { api } = createApi();
    const { storage } = createStorage("token-abc");
    const service = createSessionService({ api, storage });

    const outcome = await service.signOut();

    // Absence is a fact too: the store could not say, so the caller gets no answer to
    // read instead of an invented `false`.
    expect(outcome).toEqual({ revoke: "revoked" });
    expect(outcome).not.toHaveProperty("endsSessionOnClear");
  });
});

describe("mapSessionUser", () => {
  it("keeps the identity and the role the admin plugin exposes", () => {
    expect(
      mapSessionUser({
        id: "id-1",
        name: "Curated Admin",
        email: "admin@example.com",
        role: "admin",
      }),
    ).toEqual({
      id: "id-1",
      name: "Curated Admin",
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("treats a missing or non-string role as no role", () => {
    expect(
      mapSessionUser({ id: "id-1", name: "A", email: "a@example.com" })?.role,
    ).toBeNull();
    expect(
      mapSessionUser({ id: "id-1", name: "A", email: "a@example.com", role: 7 })
        ?.role,
    ).toBeNull();
  });

  it("refuses a payload that is not an identity", () => {
    expect(mapSessionUser(null)).toBeNull();
    expect(mapSessionUser({})).toBeNull();
    expect(mapSessionUser({ id: "id-1" })).toBeNull();
  });
});

describe("describeAuthFailure", () => {
  it("maps the library's codes to actionable text", () => {
    expect(
      describeAuthFailure({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 }),
    ).toBe("Email or password is incorrect.");
    expect(
      describeAuthFailure({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" }),
    ).toBe("An account with this email already exists.");
    expect(describeAuthFailure({ code: "PASSWORD_TOO_SHORT" })).toBe(
      "Password must be at least 8 characters.",
    );
    expect(describeAuthFailure({ code: "INVALID_EMAIL" })).toBe(
      "Enter a valid email address.",
    );
  });

  it("explains an unreachable server instead of showing a library message", () => {
    expect(describeAuthFailure({ status: 0 })).toBe(
      "Could not reach the server. Check your connection and try again.",
    );
  });

  it("falls back to the server message, then to a generic message", () => {
    expect(describeAuthFailure({ message: "Something specific" })).toBe(
      "Something specific",
    );
    expect(describeAuthFailure(null)).toBe(
      "Authentication failed. Please try again.",
    );
  });
});
