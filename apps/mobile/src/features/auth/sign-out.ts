/**
 * The two cache operations sign-out needs, taken as a port so the sequence stays testable
 * without a React tree (T6c `m2`).
 */
export interface SignOutCache {
  resetQueries(): Promise<void>;
  clear(): void;
}

export interface SignOutSequenceDeps {
  signOut: () => Promise<void>;
  cache: SignOutCache;
}

/**
 * What sign-out achieved, split by the half that produced it.
 *
 * It used to be `{ ok: true }`, which reported a reset that threw as a clean run: the
 * caller could not tell "the token is gone and the cache is clean" from "the token is gone,
 * the cache was emptied but in-flight refetches were not cancelled". The two halves are
 * separate because they are separate outcomes — the local clear is the one the user cares
 * about, and a partial cache drop is a residual, not a failure of the sign-out.
 */
export interface SignOutOutcome {
  /** The local sign-out: whether the device still holds the credential. */
  local: "cleared" | "failed";
  /** The local failure, when `local` is `"failed"`. */
  localError?: unknown;
  /** `resetQueries` before `clear()`; a failed reset still empties the cache. */
  cache: "cleared" | "partial";
  /** The reset failure, when `cache` is `"partial"`. */
  cacheError?: unknown;
}

/**
 * Signs out and always drops the cached server state (T6c `m2`).
 *
 * The settings screen used to `await signOut()` and clear the cache on the next line, so a
 * sign-out that rejected skipped the clear and left the previous identity's cached server
 * state in memory. The cache belongs to the identity that is leaving, so it is dropped
 * whatever the sign-out did — and a failing reset must not keep it either, which is why
 * `clear()` is not reached through the reset's success.
 *
 * Both halves are reported rather than thrown: the screen has to tell the user when the
 * device could not sign out, and it must not mistake "the cache is gone" for "the token is
 * gone" — nor a partial cache drop for a clean one.
 */
export async function signOutAndClearCache({
  signOut,
  cache,
}: SignOutSequenceDeps): Promise<SignOutOutcome> {
  const outcome: SignOutOutcome = { local: "cleared", cache: "cleared" };

  try {
    await signOut();
  } catch (error) {
    outcome.local = "failed";
    outcome.localError = error;
  }

  try {
    await cache.resetQueries();
  } catch (error) {
    // `clear()` below drops the cache unconditionally, so what is left is a residual: the
    // refetches were not cancelled before the cache was emptied.
    outcome.cache = "partial";
    outcome.cacheError = error;
  }
  cache.clear();

  return outcome;
}
