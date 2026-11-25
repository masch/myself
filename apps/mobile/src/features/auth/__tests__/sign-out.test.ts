import { describe, expect, it } from "bun:test";
import { signOutAndClearCache, type SignOutCache } from "../sign-out";

/**
 * Sign-out is a local decision first (T6c `m2`).
 *
 * The settings screen used to clear the React Query cache only after `await signOut()`,
 * so a sign-out that rejected skipped the clear and left the previous identity's cached
 * server state in memory. These cases pin the contract the screen relies on: the cache is
 * dropped whatever the sign-out did, and the failure is still reported to the caller.
 */
function createCache() {
  const calls: string[] = [];
  const cache: SignOutCache = {
    async resetQueries() {
      calls.push("resetQueries");
    },
    clear() {
      calls.push("clear");
    },
  };
  return { cache, calls };
}

describe("signOutAndClearCache (T6c m2)", () => {
  it("signs out and then drops the cached server state", async () => {
    const { cache, calls } = createCache();

    const outcome = await signOutAndClearCache({
      signOut: async () => {
        calls.push("signOut");
      },
      cache,
    });

    expect(outcome).toEqual({ ok: true });
    expect(calls).toEqual(["signOut", "resetQueries", "clear"]);
  });

  it("still drops the cached server state when the sign-out rejects", async () => {
    const { cache, calls } = createCache();

    const outcome = await signOutAndClearCache({
      signOut: async () => {
        throw new Error("keychain unavailable");
      },
      cache,
    });

    expect(outcome.ok).toBe(false);
    expect(calls).toEqual(["resetQueries", "clear"]);
  });

  it("drops the cached server state even when the reset itself fails", async () => {
    const calls: string[] = [];

    const outcome = await signOutAndClearCache({
      signOut: async () => {},
      cache: {
        async resetQueries() {
          calls.push("resetQueries");
          throw new Error("refetch blew up");
        },
        clear() {
          calls.push("clear");
        },
      },
    });

    // `clear` is not reached through the reset: a failed refetch must not keep the
    // previous identity's cache either.
    expect(outcome).toEqual({ ok: true });
    expect(calls).toEqual(["resetQueries", "clear"]);
  });
});
