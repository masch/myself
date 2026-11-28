import {
  GOOGLE_SIGN_IN_UNAVAILABLE,
  GoogleSignInError,
  type GoogleIdTokenProvider,
} from "./google-id-token-provider.contract";

/**
 * Google sign-in on every non-web target (S4, S27).
 *
 * This file is what the bundler resolves for iOS and Android, and the answer is always the
 * same: this platform cannot produce a Google ID token. The Expo SDK 57 surface for it
 * (`GoogleAuthRequestConfig`) is marked deprecated, `useIdTokenAuthRequest` is not
 * documented at all, and there is no native module here that mints one, so a control on
 * these targets would be dead.
 *
 * That is not a permanent "no": S27's rule is per platform and per client ID. When the
 * native clients exist — an iOS and an Android OAuth client ID plus the module that
 * exchanges them — this file grows its own configured client ID, and `available` starts
 * answering from it exactly as the web one does. Until then it reports `false`, and the
 * sign-in screen renders nothing.
 *
 * `google-id-token-provider.web.ts` is resolved instead of this file on web.
 */
export const googleIdTokenProvider: GoogleIdTokenProvider = {
  available: false,

  /**
   * Never reached by a rendered control — nothing here reports `available` — and it
   * refuses rather than resolves an empty string, so a caller that ignores `available`
   * fails loudly with the reason instead of sending Google an empty token.
   */
  async requestIdToken(): Promise<string> {
    throw new GoogleSignInError(GOOGLE_SIGN_IN_UNAVAILABLE);
  },
};
