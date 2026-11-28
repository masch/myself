import { createAuthClient } from "better-auth/client";
import { verifyEmailUrl } from "./deep-links";
import type {
  AuthRequestOutcome,
  PasswordResetApiPort,
} from "./password-reset-service";
import {
  mapSessionUser,
  SESSION_TOKEN_STORAGE_FAILURE,
  type AuthApiPort,
  type AuthResult,
  type EmailSignInInput,
  type SignUpInput,
} from "./session-service";
import type { SessionTokenStorage } from "./session-token-storage.contract";

/**
 * The response header that carries the session credential on every client (S8).
 *
 * Better Auth's `bearer` plugin sets it on every response that also sets the session
 * cookie, and exposes it to browsers (`Access-Control-Expose-Headers`), so the same
 * header is readable on native and on web. As L15 measured, this value is not the
 * token stored in `session.token`: persist it exactly as received.
 */
export const SESSION_TOKEN_RESPONSE_HEADER = "set-auth-token";

/**
 * How long any auth request may stay unanswered (T6c `M1`).
 *
 * The same 10-second budget the app's HTTP client uses (`http-client.ts`): a request that
 * outlives it is aborted, so a connection that swallows packets fails instead of leaving
 * the launch waiting for an answer that will not come.
 */
export const AUTH_REQUEST_TIMEOUT_MS = 10_000;

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface AuthApiOptions {
  baseUrl: string;
  storage: SessionTokenStorage;
  /** Test seam: route the client's traffic through an in-process app. */
  fetchImpl?: FetchLike;
  /** Test seam: shorten the request deadline (T6c `M1`). */
  requestTimeoutMs?: number;
  /**
   * Cookie mode for the browser. `include` is what makes the cookie jar the web session
   * (S22, S26); the API grants it now that T5 landed the credentialed allowlist.
   */
  credentials?: RequestCredentials;
}

/**
 * Cookie mode for the browser client: the cookie is the web session (S22, S26).
 *
 * This was `same-origin` while the API answered CORS with a wildcard, because the browser
 * refuses a credentialed response whose `Access-Control-Allow-Origin` is `*`; with that
 * mode the browser stored no cookie at all and a reload signed the user out. T5 landed the
 * explicit allowlist with `Access-Control-Allow-Credentials`, so `include` is now possible
 * and the session survives a page load. Pinned by the e2e suite: after a sign-in the
 * browser context has a non-empty cookie jar and a `page.goto` stays authenticated.
 *
 * The bearer token is still captured and sent (S8): it is what a native client uses, and
 * it keeps the web client working if a deployment forgets `CORS_ALLOWED_ORIGINS`.
 */
export const COOKIE_MODE: RequestCredentials = "include";

/** A transport failure, distinguished from an API answer by having no status. */
const TRANSPORT_FAILURE_STATUS = 0;

function asError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

/** The per-request hook that persists the credential of one response. */
type TokenWriteHook = (context: { response: Response }) => Promise<void>;

/**
 * The credential write, and its failure, of exactly one call (T6c `m7`).
 *
 * Captured out of the response hook rather than thrown out of it: the fetch layer turns a
 * hook rejection into its own `{ status: 500 }` answer and drops the reason, so a keychain
 * failure would reach the caller as an unexplained server error. The recorded reason is
 * turned into a result with its own code by `call` below.
 *
 * One of these belongs to one call, and its hook is handed to that call's own request, so
 * a failure is visible only to the call whose response carried the token. A client-wide
 * slot cannot express that: the hook fires while the request it belongs to is still in
 * flight, so with two calls open the slot would hold one call's failure while the other
 * read it, and a call whose response carried no token at all would inherit a failure it
 * never triggered. Per-request options are what make the correlation structural rather
 * than best-effort: `better-auth` merges them into that one request and awaits the hook
 * before the request resolves.
 */
interface TokenWrite {
  failure: Error | null;
  onSuccess: TokenWriteHook;
}

function createTokenWrite(storage: SessionTokenStorage): TokenWrite {
  const write: TokenWrite = {
    failure: null,
    async onSuccess(context) {
      const token = context.response.headers.get(SESSION_TOKEN_RESPONSE_HEADER);
      if (!token) return;

      try {
        await storage.set(token);
      } catch (error) {
        // Recorded, not thrown: see the `TokenWrite` docstring for why.
        write.failure = asError(error);
      }
    },
  };
  return write;
}

function toResult(raw: {
  data?: unknown;
  error?: { code?: string; message?: string; status?: number } | null;
}): AuthResult {
  if (raw.error) {
    return {
      user: null,
      error: {
        code: raw.error.code,
        message: raw.error.message,
        status: raw.error.status,
      },
    };
  }

  const data = raw.data as { user?: unknown } | null | undefined;
  return { user: data?.user ? mapSessionUser(data.user) : null, error: null };
}

function transportFailure(error: unknown): AuthResult {
  return {
    user: null,
    error: {
      status: TRANSPORT_FAILURE_STATUS,
      message: error instanceof Error ? error.message : String(error),
    },
  };
}

/**
 * The same transport distinction for the requests that answer with no identity (S13).
 *
 * A reset request and a completed reset change a credential, they do not sign anybody in,
 * so they only need to say whether the server refused and why. A thrown request becomes the
 * status-0 answer, which is the one shape the callers already read as "no answer arrived".
 */
async function request(
  operation: () => Promise<{
    error?: { code?: string; message?: string; status?: number } | null;
  }>,
): Promise<AuthRequestOutcome> {
  try {
    const { error } = await operation();
    if (!error) return { error: null };
    return {
      error: {
        code: error.code,
        message: error.message,
        status: error.status,
      },
    };
  } catch (error) {
    return { error: transportFailure(error).error };
  }
}

/**
 * The sign-in succeeded and the device could not keep the credential (T6c `m7`).
 *
 * Deliberately without a `status`: the request answered, so nothing here is a transport
 * failure, and `describeAuthFailure` reads the code and says what actually happened.
 */
function localStorageFailure(error: Error): AuthResult {
  return {
    user: null,
    error: {
      code: SESSION_TOKEN_STORAGE_FAILURE,
      message: error.message,
    },
  };
}

/**
 * Adapts `better-auth/client` to the app's {@link AuthApiPort} (S8, S13).
 *
 * Two responsibilities, both here so no other module knows the library:
 *
 * 1. Capture the `set-auth-token` header of every successful auth response into the
 *    platform token store. `onSuccess` is awaited by the fetch layer before the call
 *    resolves, so a sign-in never resolves before its token is persisted.
 * 2. Present that token as `Authorization: Bearer` on every request, which is what
 *    lets a native (and, until T5, a web) client resolve its session at all.
 */
export function createAuthApi({
  baseUrl,
  storage,
  fetchImpl,
  requestTimeoutMs = AUTH_REQUEST_TIMEOUT_MS,
  credentials = COOKIE_MODE,
}: AuthApiOptions): AuthApiPort & PasswordResetApiPort {
  const client = createAuthClient({
    baseURL: baseUrl,
    fetchOptions: {
      credentials,
      // Every auth request carries a deadline (T6c `M1`). The abort surfaces as a thrown
      // transport failure, which `call` below turns into the status-0 result the session
      // service reads as "unavailable" rather than "signed out".
      timeout: requestTimeoutMs,
      ...(fetchImpl ? { customFetchImpl: fetchImpl } : {}),
      auth: {
        type: "Bearer",
        token: async () => (await storage.get()) ?? undefined,
      },
    },
  });

  async function call(
    operation: (
      onSuccess: TokenWriteHook,
    ) => Promise<Parameters<typeof toResult>[0]>,
  ): Promise<AuthResult> {
    const write = createTokenWrite(storage);

    try {
      const result = toResult(await operation(write.onSuccess));
      // A sign-in that answered but could not be remembered is a failure the user has to
      // see, even though the server part worked (T6c `m7`).
      return write.failure ? localStorageFailure(write.failure) : result;
    } catch (error) {
      return write.failure
        ? localStorageFailure(write.failure)
        : transportFailure(error);
    }
  }

  return {
    signInEmail(input: EmailSignInInput) {
      return call((onSuccess) =>
        client.signIn.email(
          {
            email: input.email,
            password: input.password,
          },
          { onSuccess },
        ),
      );
    },

    /**
     * Exchanges a Google ID token for a session (S4).
     *
     * The same client, the same `set-auth-token` capture and the same `AuthResult` as a
     * password sign-in: only the request changes. The body field is `idToken: { token }`,
     * not a bare string — read out of the installed library's `socialSignInBodySchema`
     * (`better-auth/dist/api/routes/sign-in.mjs:61`) and proven against the real API in
     * `apps/api/src/routes/__tests__/google-sign-in.test.ts`. No redirect is involved, so
     * no browser session and no deep link is either.
     */
    signInWithGoogle(idToken: string) {
      return call((onSuccess) =>
        client.signIn.social(
          {
            provider: "google",
            idToken: { token: idToken },
          },
          { onSuccess },
        ),
      );
    },

    signUpEmail(input: SignUpInput) {
      return call((onSuccess) =>
        client.signUp.email(
          {
            name: input.name,
            email: input.email,
            password: input.password,
            // Where the verification email lands (S13). Without it the library's default is
            // `/`, i.e. the API's own base path, and the app would never hear the outcome.
            callbackURL: verifyEmailUrl(),
          },
          { onSuccess },
        ),
      );
    },

    /** Asks for a reset link the client can open; it never reveals whether the account
     * exists, and the server answers the same either way (S2). */
    requestPasswordReset(input: { email: string; redirectTo: string }) {
      return request(() =>
        client.requestPasswordReset({
          email: input.email,
          redirectTo: input.redirectTo,
        }),
      );
    },

    /** Sets the new password. The token arrives through the reset deep link (S13). */
    resetPassword(input: { token: string; newPassword: string }) {
      return request(() =>
        client.resetPassword({
          newPassword: input.newPassword,
          token: input.token,
        }),
      );
    },

    getSession() {
      return call((onSuccess) =>
        client.getSession({ fetchOptions: { onSuccess } }),
      );
    },

    async signOut() {
      await client.signOut();
    },
  };
}
