/**
 * The Google ID token port (S4).
 *
 * The app needs exactly one thing from Google: an `id_token` the API can verify. It must
 * not care where it came from, because the answer differs by platform — the browser gets
 * one from Google Identity Services, and a native client would have to get one from a
 * native module that does not exist here yet. The two implementations (`available` and
 * `requestIdToken`) live in the bundler-resolved pair next to this file, the same way
 * `deep-links.ts`/`deep-links.web.ts` and
 * `request-credentials.ts`/`request-credentials.web.ts` already split.
 *
 * `available` is the whole gate for the button (S4): a platform whose own client ID is not
 * configured reports `false`, and the sign-in screen renders no control at all. Nothing
 * else may decide it — not a build flag, not the platform, not a feature toggle — because
 * a button that cannot complete is worse than no button.
 */
export interface GoogleIdTokenProvider {
  /** True only when this platform can actually produce an ID token right now. */
  readonly available: boolean;
  /**
   * Asks Google for one ID token, through whatever this platform uses.
   *
   * Rejects with a {@link GoogleSignInError} — never a library error, which the screens
   * would have to show as-is — when the person closes the window, when the browser cannot
   * show it, or when this platform has no way to produce one.
   */
  requestIdToken(): Promise<string>;
}

/**
 * A Google sign-in that did not produce a token, with a message a person can read.
 *
 * Deliberately not `AuthenticationError`: nothing was refused by this app's server, so the
 * screen must not present it as a rejected sign-in. The message is written here, not
 * passed through from Google, because Google's own errors are not user-facing prose.
 */
export class GoogleSignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleSignInError";
  }
}

/**
 * The public variable that carries the web client ID (`EXPO_PUBLIC_*`).
 *
 * Expo inlines `EXPO_PUBLIC_*` values into the client bundle at build time, which is why
 * the web implementation reads the literal `process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
 * member expression instead of indexing with this constant. It is named here so the
 * documentation, `.env.example` and the tests all say the same thing.
 *
 * This is the **Web application** OAuth client ID from Google Cloud, and it must equal the
 * API's `GOOGLE_CLIENT_ID`: that value is the `aud` claim the server checks before it
 * accepts the token. It is public by design — a client ID is not a secret; the client
 * secret never leaves the server.
 */
export const GOOGLE_WEB_CLIENT_ID_ENV = "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID";

/** This platform has no Google sign-in, and says so instead of pretending. */
export const GOOGLE_SIGN_IN_UNAVAILABLE =
  "Google sign-in is not available on this platform. Sign in with your email and password instead.";

/** The build carries no client ID, so there is nothing for Google to verify against. */
export const GOOGLE_SIGN_IN_NOT_CONFIGURED =
  "Google sign-in is not configured in this build. Sign in with your email and password instead.";

/**
 * Whether a client ID is configured at all (S4).
 *
 * The single definition of "configured", so the provider's `available` and every refusal
 * agree: a value that is missing, empty or only whitespace is no client ID.
 */
export function isGoogleClientIdConfigured(
  raw: string | undefined | null,
): boolean {
  return typeof raw === "string" && raw.trim().length > 0;
}
