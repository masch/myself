/**
 * The contract every platform implementation of the session-token store honours
 * (S9, S22).
 *
 * It is deliberately tiny: the token is written once per sign-in, read once per
 * cold start and removed on sign-out. Keeping the shape here means the native and
 * web implementations cannot drift apart, and no consumer ever branches on the
 * platform itself.
 */
export interface SessionTokenStorage {
  /** Returns the stored token, or `null` when this client has no session. */
  get(): Promise<string | null>;
  /** Persists the token captured from the auth response. */
  set(token: string): Promise<void>;
  /** Removes the token; safe to call when nothing is stored. */
  clear(): Promise<void>;
}
