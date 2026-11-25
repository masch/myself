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

/** Whether the local sign-out itself succeeded; the cache is dropped either way. */
export type SignOutOutcome = { ok: true } | { ok: false; error: unknown };

/**
 * Signs out and always drops the cached server state (T6c `m2`).
 *
 * The settings screen used to `await signOut()` and clear the cache on the next line, so a
 * sign-out that rejected skipped the clear and left the previous identity's cached server
 * state in memory. The cache belongs to the identity that is leaving, so it is dropped
 * whatever the sign-out did — and a failing reset must not keep it either, which is why
 * `clear()` is not reached through the reset's success.
 *
 * The failure is still reported, as a value rather than a throw: the screen has to tell
 * the user, and it must not mistake "the cache is gone" for "the token is gone".
 */
export async function signOutAndClearCache({
  signOut,
  cache,
}: SignOutSequenceDeps): Promise<SignOutOutcome> {
  let outcome: SignOutOutcome = { ok: true };

  try {
    await signOut();
  } catch (error) {
    outcome = { ok: false, error };
  }

  try {
    await cache.resetQueries();
  } catch {
    // Ignored on purpose: `clear()` below drops the cache unconditionally, so a refetch
    // that failed while the session was being torn down changes nothing.
  }
  cache.clear();

  return outcome;
}
