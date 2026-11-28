import { describe, expect, it } from "bun:test";
import { signOutAndClearCache, type SignOutCache } from "../sign-out";

/**
 * Sign-out is a local decision first (T6c `m2`), and its outcome has to be honest (T6c
 * L31 review).
 *
 * The settings screen used to clear the React Query cache only after `await signOut()`,
 * so a sign-out that rejected skipped the clear and left the previous identity's cached
 * server state in memory. These cases pin the contract the screen relies on: the cache is
 * dropped whatever the sign-out did, the local clear and the cache drop are reported
 * separately, and a reset that failed is visible instead of being folded into a clean
 * "ok".
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

describe("signOutAndClearCache (T6c m2, L31 review)", () => {
  it("signs out and then drops the cached server state", async () => {
    const { cache, calls } = createCache();

    const outcome = await signOutAndClearCache({
      signOut: async () => {
        calls.push("signOut");
      },
      cache,
    });

    expect(outcome).toEqual({ local: "cleared", cache: "cleared" });
    expect(calls).toEqual(["signOut", "resetQueries", "clear"]);
  });

  it("still drops the cached server state when the sign-out rejects", async () => {
    const { cache, calls } = createCache();
    const failure = new Error("keychain unavailable");

    const outcome = await signOutAndClearCache({
      signOut: async () => {
        throw failure;
      },
      cache,
    });

    // The name says which half failed: the local clear. A caller that only saw `ok: false`
    // could not tell that apart from a partial cache cleanup.
    expect(outcome).toEqual({
      local: "failed",
      localError: failure,
      cache: "cleared",
    });
    expect(calls).toEqual(["resetQueries", "clear"]);
  });

  it("drops the cached server state even when the reset itself fails, and says so", async () => {
    const calls: string[] = [];
    const resetFailure = new Error("refetch blew up");

    const outcome = await signOutAndClearCache({
      signOut: async () => {},
      cache: {
        async resetQueries() {
          calls.push("resetQueries");
          throw resetFailure;
        },
        clear() {
          calls.push("clear");
        },
      },
    });

    // `clear` is not reached through the reset: a failed refetch must not keep the
    // previous identity's cache either. The partial result is reported, not hidden: the
    // in-flight refetches were not cancelled before the cache was emptied.
    expect(outcome).toEqual({
      local: "cleared",
      cache: "partial",
      cacheError: resetFailure,
    });
    expect(calls).toEqual(["resetQueries", "clear"]);
  });
});

/**
 * The other half of a sign-out (T2, S3).
 *
 * `local: "cleared"` is a statement about this device, not about the session the server
 * holds. On the web the browser owns the cookie and no local code can clear it, so a
 * revoke that never arrived leaves the session live: the outcome has to carry that instead
 * of reading as a completed sign-out. `local` and `cache` keep the meanings they had.
 */
describe("signOutAndClearCache and the server session (T2, S3)", () => {
  it("reports that the server ended the session", async () => {
    const { cache, calls } = createCache();

    const outcome = await signOutAndClearCache({
      signOut: async () => {
        calls.push("signOut");
        return { revoke: "revoked" };
      },
      cache,
    });

    expect(outcome).toEqual({
      local: "cleared",
      revoke: "revoked",
      cache: "cleared",
    });
    expect(calls).toEqual(["signOut", "resetQueries", "clear"]);
  });

  it("reports an unreachable server with its reason, and still drops the cache", async () => {
    const { cache, calls } = createCache();
    const failure = new Error("fetch failed");

    const outcome = await signOutAndClearCache({
      signOut: async () => {
        calls.push("signOut");
        return { revoke: "unreachable", revokeError: failure };
      },
      cache,
    });

    // The cache belongs to the identity that is leaving, so it is dropped either way; and
    // the local clear did happen, which is why `local` keeps its meaning instead of being
    // turned into a local failure. What is new is the third answer: the server did not end
    // the session, so nothing here may read as a completed sign-out.
    expect(outcome).toEqual({
      local: "cleared",
      revoke: "unreachable",
      revokeError: failure,
      cache: "cleared",
    });
    expect(calls).toEqual(["signOut", "resetQueries", "clear"]);
  });
});
