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

function createStorage(initial: string | null = null) {
  const state = { token: initial, clears: 0, sets: [] as string[] };
  const storage: SessionTokenStorage = {
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

      expect(await service.restore()).toEqual(USER);
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

      expect(await service.restore()).toBeNull();
      expect(state.clears).toBe(1);
      expect(await storage.get()).toBeNull();
    });

    it("clears the token when the server answers with no session at all", async () => {
      const { api } = createApi({
        async getSession() {
          return { user: null, error: null };
        },
      });
      const { storage, state } = createStorage("stale-token");
      const service = createSessionService({ api, storage });

      expect(await service.restore()).toBeNull();
      expect(state.clears).toBe(1);
    });

    it("keeps the token when the server cannot be reached (offline cold start)", async () => {
      const { api } = createApi({
        async getSession() {
          throw new Error("fetch failed");
        },
      });
      const { storage, state } = createStorage("still-valid-token");
      const service = createSessionService({ api, storage });

      expect(await service.restore()).toBeNull();
      expect(state.clears).toBe(0);
      expect(await storage.get()).toBe("still-valid-token");
    });
  });

  describe("signOut", () => {
    it("clears the stored token after the server revokes the session", async () => {
      const { api, calls } = createApi();
      const { storage, state } = createStorage("token-abc");
      const service = createSessionService({ api, storage });

      await service.signOut();

      expect(calls).toContain("signOut");
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
