import { beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * Native session-token storage (S9, S22).
 *
 * `expo-secure-store` needs a device, so it is mocked here: these tests pin the
 * module's contract (one key, never fail open, clear on sign-out) without a device.
 */
const keychain = new Map<string, string>();
const state = { failing: false };

mock.module("expo-secure-store", () => ({
  getItemAsync: async (key: string) => {
    if (state.failing) throw new Error("keychain unavailable");
    return keychain.get(key) ?? null;
  },
  setItemAsync: async (key: string, value: string) => {
    if (state.failing) throw new Error("keychain unavailable");
    keychain.set(key, value);
  },
  deleteItemAsync: async (key: string) => {
    if (state.failing) throw new Error("keychain unavailable");
    keychain.delete(key);
  },
}));

const { sessionTokenStorage, SESSION_TOKEN_STORAGE_KEY } =
  await import("../session-token-storage");

describe("sessionTokenStorage (native, expo-secure-store)", () => {
  beforeEach(() => {
    keychain.clear();
    state.failing = false;
  });

  it("stores the session token in SecureStore under a single documented key", async () => {
    await sessionTokenStorage.set("token-abc");

    expect(keychain.size).toBe(1);
    expect(keychain.get(SESSION_TOKEN_STORAGE_KEY)).toBe("token-abc");
  });

  it("reads back the stored token", async () => {
    await sessionTokenStorage.set("token-abc");

    expect(await sessionTokenStorage.get()).toBe("token-abc");
  });

  it("reports no session when nothing was stored", async () => {
    expect(await sessionTokenStorage.get()).toBeNull();
  });

  it("clears the stored token, and clearing an empty store is not an error", async () => {
    await sessionTokenStorage.set("token-abc");
    await sessionTokenStorage.clear();

    expect(await sessionTokenStorage.get()).toBeNull();
    expect(keychain.size).toBe(0);
    await sessionTokenStorage.clear();
    expect(keychain.size).toBe(0);
  });

  it("propagates a keychain failure instead of pretending there is no session", async () => {
    state.failing = true;

    const readFailure = await sessionTokenStorage.get().catch((error) => error);
    const writeFailure = await sessionTokenStorage
      .set("token-abc")
      .catch((error) => error);

    expect(readFailure).toBeInstanceOf(Error);
    expect((readFailure as Error).message).toBe("keychain unavailable");
    expect(writeFailure).toBeInstanceOf(Error);
    expect((writeFailure as Error).message).toBe("keychain unavailable");
  });
});
