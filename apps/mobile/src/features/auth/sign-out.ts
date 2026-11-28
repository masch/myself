import type { SessionRevoke } from "@/infrastructure/auth/session-service";

/**
 * The two cache operations sign-out needs, taken as a port so the sequence stays testable
 * without a React tree (T6c `m2`).
 */
export interface SignOutCache {
  resetQueries(): Promise<void>;
  clear(): void;
}

export interface SignOutSequenceDeps {
  /**
   * Runs the sign-out and reports what the server half did (T2).
   *
   * It resolves with the revoke outcome, or with nothing from a caller that does not report
   * one; the source of that answer is the session service, which is the only place that
   * knows whether the server was asked.
   */
  signOut: () => Promise<SessionRevoke | void>;
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
  /**
   * The server half: whether it ended the session, or could not be reached (T2, S3).
   *
   * Absent when the sign-out never got that far — the local clear threw, so nothing was
   * asked of the server, or the caller reported no revoke outcome at all. `"revoked"`
   * there would be a claim this sequence cannot make.
   */
  revoke?: "revoked" | "unreachable";
  /** The failure that left the server unreached, when `revoke` is `"unreachable"`. */
  revokeError?: unknown;
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
 *
 * Since T2 the outcome also carries what the server did, because `local: "cleared"` is a
 * statement about this device only. On the web the browser owns the session cookie and no
 * local code can clear it, so a revoke that never arrived leaves the session live — but the
 * outcome says that on every platform, not just where it matters most: an unreachable
 * server is a fact about the session, and a native device that dropped its token while the
 * server kept the session has the same live session waiting for its expiry. Nothing here
 * branches on the platform to decide whether to tell the truth.
 */
export async function signOutAndClearCache({
  signOut,
  cache,
}: SignOutSequenceDeps): Promise<SignOutOutcome> {
  const outcome: SignOutOutcome = { local: "cleared", cache: "cleared" };

  try {
    const server = await signOut();
    if (server) {
      outcome.revoke = server.revoke;
      if (server.revokeError !== undefined) {
        outcome.revokeError = server.revokeError;
      }
    }
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
