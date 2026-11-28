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
  /**
   * Whether `clear()` ends the session for this client (S3), not just the stored copy.
   *
   * `true` where the token the store holds *is* the session: once it is gone the device
   * cannot prove the identity to anyone. `false` where something outside this app owns the
   * session and no local code can clear it — the browser cookie on web, which only the
   * server revoke ends.
   *
   * Optional because a store may not be able to answer. **Absence means "this store cannot
   * say"**, and it is read as `false` — "clearing may not have ended the session" — because
   * the safe reading of an unknown is that the session may still be live on the server. It is
   * never read as `true`: no caller may keep a credential-less identity on a guess.
   */
  readonly endsSessionOnClear?: boolean;
}
