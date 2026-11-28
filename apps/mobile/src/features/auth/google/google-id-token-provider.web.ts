import {
  GOOGLE_SIGN_IN_NOT_CONFIGURED,
  GoogleSignInError,
  isGoogleClientIdConfigured,
  type GoogleIdTokenProvider,
} from "./google-id-token-provider.contract";

/**
 * Google sign-in in the browser (S4), through Google Identity Services.
 *
 * Why this and not a redirect: the API already accepts `{ provider: "google", idToken }`
 * and answers with a session (`apps/api/src/routes/__tests__/google-sign-in.test.ts`
 * proves it against a mocked IdP). Google Identity Services hands the same `id_token` to
 * the page directly, so nothing here redirects, nothing here needs the API's cookie dance,
 * and the token reaches the existing auth client exactly as a password does.
 *
 * What this file owns: loading Google's script, asking it to prompt, and refusing in words
 * a person can read when it cannot. It does not verify the token — the server does — and
 * it never touches the session.
 *
 * The bundler resolves this file for a web build and `google-id-token-provider.ts`
 * (which reports `available: false`) everywhere else.
 */

/** Google's Identity Services client. The only script this module ever loads. */
export const GOOGLE_IDENTITY_SCRIPT_URL =
  "https://accounts.google.com/gsi/client";

/** Refusals, in the app's words: Google's own errors are not user-facing prose. */
export const GOOGLE_SIGN_IN_CLOSED =
  "The Google sign-in window was closed before it finished. Try again, or use your email and password.";
export const GOOGLE_SIGN_IN_NOT_SHOWN =
  "This browser could not show the Google sign-in window. Allow third-party sign-in, or use your email and password.";
export const GOOGLE_SIGN_IN_COULD_NOT_LOAD =
  "Google sign-in could not be loaded. Check your connection and try again.";

/** What `google.accounts.id` hands the configured callback on success. */
interface GisCredentialResponse {
  /** The ID token: a signed JWT whose audience is the client ID below. */
  credential?: string;
}

/** How `prompt` reports what became of the window it tried to show. */
interface GisPromptMoment {
  isNotDisplayed?(): boolean;
  isSkippedMoment?(): boolean;
  isDismissedMoment?(): boolean;
}

/** The slice of `google.accounts.id` this port uses. */
interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: GisCredentialResponse) => void;
      }): void;
      prompt(listener?: (moment: GisPromptMoment) => void): void;
    };
  };
}

/**
 * The in-flight load, shared by every press.
 *
 * One script element, one promise: a second press while the first is still loading joins
 * the load instead of appending a second `<script>`. A failed load is forgotten so the
 * next press can retry.
 */
let loading: Promise<GoogleIdentityServices> | null = null;

function currentGoogle(): GoogleIdentityServices | undefined {
  return (globalThis as { google?: GoogleIdentityServices }).google;
}

function loadGoogleIdentityServices(): Promise<GoogleIdentityServices> {
  if (loading) return loading;

  loading = new Promise<GoogleIdentityServices>((resolve, reject) => {
    const alreadyLoaded = currentGoogle();
    if (alreadyLoaded?.accounts?.id) {
      resolve(alreadyLoaded);
      return;
    }

    const fail = (message: string) => {
      loading = null;
      reject(new GoogleSignInError(message));
    };

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    // Both handlers run long after the executor below returns, so clearing `loading` in
    // `fail` cannot race the assignment that follows it.
    script.addEventListener("load", () => {
      const loaded = currentGoogle();
      if (loaded?.accounts?.id) resolve(loaded);
      else fail(GOOGLE_SIGN_IN_COULD_NOT_LOAD);
    });
    script.addEventListener("error", () => fail(GOOGLE_SIGN_IN_COULD_NOT_LOAD));
    document.head.appendChild(script);
  });

  return loading;
}

/**
 * Initializes Google's prompt with the configured client ID and resolves the ID token.
 *
 * `prompt()` is what shows the window; the token arrives in `initialize`'s callback, not
 * from `prompt()`'s return value. The promise settles exactly once: on the credential, on
 * a window that could not be shown, or on a window the person closed — never leaving a
 * press waiting for an answer that will not come.
 */
async function requestIdTokenFromGoogle(clientId: string): Promise<string> {
  const gis = await loadGoogleIdentityServices();

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      action();
    };
    const refuse = (message: string) =>
      settle(() => reject(new GoogleSignInError(message)));

    gis.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        const credential = response?.credential;
        if (typeof credential === "string" && credential.length > 0) {
          settle(() => resolve(credential));
          return;
        }
        refuse(GOOGLE_SIGN_IN_CLOSED);
      },
    });

    gis.accounts.id.prompt((moment) => {
      if (moment?.isNotDisplayed?.()) {
        refuse(GOOGLE_SIGN_IN_NOT_SHOWN);
        return;
      }
      if (moment?.isSkippedMoment?.() || moment?.isDismissedMoment?.()) {
        refuse(GOOGLE_SIGN_IN_CLOSED);
      }
    });
  });
}

/**
 * Builds the port for one client ID (S4).
 *
 * A factory rather than a hard-wired singleton, so the availability rule is testable
 * without a browser: `available` is `true` if and only if a client ID is configured, and
 * a provider built with nothing refuses before it touches `document` at all.
 */
export function createGoogleIdTokenProvider(
  clientId: string | undefined,
): GoogleIdTokenProvider {
  const configuredClientId = (clientId ?? "").trim();

  return {
    available: isGoogleClientIdConfigured(configuredClientId),

    requestIdToken(): Promise<string> {
      if (!isGoogleClientIdConfigured(configuredClientId)) {
        return Promise.reject(
          new GoogleSignInError(GOOGLE_SIGN_IN_NOT_CONFIGURED),
        );
      }
      return requestIdTokenFromGoogle(configuredClientId);
    },
  };
}

/**
 * The web instance, built from the value Expo inlined at build time.
 *
 * The literal member expression is deliberate: Expo replaces exactly
 * `process.env.EXPO_PUBLIC_*` accesses, so indexing `process.env` with a constant would
 * read `undefined` in a real build. `GOOGLE_WEB_CLIENT_ID_ENV` in the contract names the
 * same variable for documentation and tests.
 */
export const googleIdTokenProvider = createGoogleIdTokenProvider(
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
);
