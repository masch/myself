import type { SessionTokenStorage } from "./session-token-storage.contract";

/**
 * Web session-token storage: memory only (S22).
 *
 * The browser has no SecureStore, and a session token must never be written to
 * local storage, session storage or any other persistent store it can read back —
 * that is a credential any script on the origin could exfiltrate later.
 *
 * So the web client keeps the token for the lifetime of the page and relies on the
 * browser's own cookie jar across reloads. Since T5 landed the credentialed CORS
 * allowlist the cookie is the session that survives a page load, and the app's HTTP
 * client asks for it (`REQUEST_CREDENTIALS` in `infrastructure/http/request-credentials
 * .web.ts`); this in-memory token is what a request made during the same page lifetime
 * presents as a bearer header, which is the transport native uses unconditionally. The
 * platform split is what keeps
 * `expo-secure-store` out of the web bundle: the bundler resolves this file instead
 * of `session-token-storage.ts`, so neither the module nor its native dependency is
 * ever imported on web.
 */
let memoryToken: string | null = null;

export const sessionTokenStorage: SessionTokenStorage = {
  /**
   * Clearing this token does not end the session (S3): the browser owns the session cookie
   * and no local code can clear it, so only the server revoke ends it.
   */
  endsSessionOnClear: false,

  async get() {
    return memoryToken;
  },

  async set(token) {
    memoryToken = token;
  },

  async clear() {
    memoryToken = null;
  },
};
