import * as SecureStore from "expo-secure-store";
import type { SessionTokenStorage } from "./session-token-storage.contract";

/**
 * Keychain-backed session-token storage for native builds (S9, S22).
 *
 * This module is the native half of the platform split: the bundler resolves
 * `session-token-storage.web.ts` instead of this file on web, so neither this import
 * of `expo-secure-store` nor the native module itself can reach the web bundle. Never
 * move the token to `expo-sqlite`: the device database is copied, inspected and
 * accessible to anything holding the SQLite file, which is exactly what a session
 * credential must not be.
 */
export const SESSION_TOKEN_STORAGE_KEY = "myself.session-token";

/**
 * Failures are propagated, never swallowed: a keychain error reported as "no
 * session" would sign the user out silently, and reported on write it would leave a
 * live server session with no token to present it.
 */
export const sessionTokenStorage: SessionTokenStorage = {
  async get() {
    return SecureStore.getItemAsync(SESSION_TOKEN_STORAGE_KEY);
  },

  async set(token) {
    await SecureStore.setItemAsync(SESSION_TOKEN_STORAGE_KEY, token);
  },

  async clear() {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_STORAGE_KEY);
  },
};
