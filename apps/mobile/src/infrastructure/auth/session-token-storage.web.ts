import type { SessionTokenStorage } from "./session-token-storage.contract";

/**
 * Web session-token storage: memory only (S22).
 *
 * The browser has no SecureStore, and a session token must never be written to
 * local storage, session storage or any other persistent store it can read back —
 * that is a credential any script on the origin could exfiltrate later.
 *
 * So the web client keeps the token for the lifetime of the page and relies on the
 * browser's own cookie jar across reloads. Consequence, recorded rather than hidden:
 * until the cookie transport is usable cross-origin (T5's credentialed CORS
 * allowlist), the browser presents the session through this in-memory bearer token,
 * so a full page reload signs the user out. The platform split is what keeps
 * `expo-secure-store` out of the web bundle: the bundler resolves this file instead
 * of `session-token-storage.ts`, so neither the module nor its native dependency is
 * ever imported on web.
 */
let memoryToken: string | null = null;

export const sessionTokenStorage: SessionTokenStorage = {
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
