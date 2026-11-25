import { createAuthClient } from "better-auth/client";
import {
  mapSessionUser,
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

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface AuthApiOptions {
  baseUrl: string;
  storage: SessionTokenStorage;
  /** Test seam: route the client's traffic through an in-process app. */
  fetchImpl?: FetchLike;
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
  credentials = COOKIE_MODE,
}: AuthApiOptions): AuthApiPort {
  const client = createAuthClient({
    baseURL: baseUrl,
    fetchOptions: {
      credentials,
      ...(fetchImpl ? { customFetchImpl: fetchImpl } : {}),
      auth: {
        type: "Bearer",
        token: async () => (await storage.get()) ?? undefined,
      },
      onSuccess: async (context) => {
        const token = context.response.headers.get(
          SESSION_TOKEN_RESPONSE_HEADER,
        );
        if (token) await storage.set(token);
      },
    },
  });

  async function call(
    operation: () => Promise<Parameters<typeof toResult>[0]>,
  ): Promise<AuthResult> {
    try {
      return toResult(await operation());
    } catch (error) {
      return transportFailure(error);
    }
  }

  return {
    signInEmail(input: SignInInput) {
      return call(() =>
        client.signIn.email({
          email: input.email,
          password: input.password,
        }),
      );
    },

    signUpEmail(input: SignUpInput) {
      return call(() =>
        client.signUp.email({
          name: input.name,
          email: input.email,
          password: input.password,
        }),
      );
    },

    getSession() {
      return call(() => client.getSession());
    },

    async signOut() {
      await client.signOut();
    },
  };
}
