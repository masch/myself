import { createAuthClient } from "better-auth/client";
import {
  mapSessionUser,
  SESSION_TOKEN_STORAGE_FAILURE,
  type AuthApiPort,
  type AuthResult,
  type SignInInput,
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
}: AuthApiOptions): AuthApiPort {
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
    signInEmail(input: SignInInput) {
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

    signUpEmail(input: SignUpInput) {
      return call((onSuccess) =>
        client.signUp.email(
          {
            name: input.name,
            email: input.email,
            password: input.password,
          },
          { onSuccess },
        ),
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
