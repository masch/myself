import type { SessionTokenStorage } from "./session-token-storage.contract";

/**
 * The session identity the app works with (S13).
 *
 * Deliberately not Better Auth's `Session["user"]` type: the app needs four fields,
 * and importing the library's inferred types (or the API package's) would couple the
 * screen layer to the server's wire shape. `role` is the admin plugin's field and is
 * read defensively because it is not part of the library's base user type.
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput extends SignInInput {
  name: string;
}

export interface AuthFailure {
  code?: string;
  message?: string;
  status?: number;
}

export interface AuthResult {
  user: SessionUser | null;
  error: AuthFailure | null;
}

/**
 * The narrow port the session service needs from the auth client.
 *
 * It exists so the service can be tested without HTTP, and so the `better-auth/client`
 * adapter is the only place that knows the library's response shape.
 */
export interface AuthApiPort {
  signInEmail(input: SignInInput): Promise<AuthResult>;
  signUpEmail(input: SignUpInput): Promise<AuthResult>;
  getSession(): Promise<AuthResult>;
  signOut(): Promise<void>;
}

/** A failed sign-in or sign-up whose message is safe to show to the user. */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export interface SessionService {
  signIn(input: SignInInput): Promise<SessionUser>;
  signUp(input: SignUpInput): Promise<SessionUser>;
  signOut(): Promise<void>;
  restore(): Promise<SessionUser | null>;
}

const GENERIC_FAILURE = "Authentication failed. Please try again.";
const UNREACHABLE_SERVER =
  "Could not reach the server. Check your connection and try again.";

const FAILURE_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email or password is incorrect.",
  INVALID_PASSWORD: "Email or password is incorrect.",
  USER_ALREADY_EXISTS: "An account with this email already exists.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "An account with this email already exists.",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
  PASSWORD_TOO_LONG: "Password must be at most 128 characters.",
  INVALID_EMAIL: "Enter a valid email address.",
};

/**
 * Turns a failed auth response into text a person can act on.
 *
 * A `status` of 0 means no response arrived at all (the transport failed), which is
 * the one failure whose cause the user can fix themselves.
 */
export function describeAuthFailure(failure: AuthFailure | null): string {
  if (!failure) return GENERIC_FAILURE;
  if (failure.status === 0) return UNREACHABLE_SERVER;
  if (failure.code && FAILURE_MESSAGES[failure.code]) {
    return FAILURE_MESSAGES[failure.code];
  }
  if (failure.message && failure.message.trim().length > 0) {
    return failure.message;
  }
  return GENERIC_FAILURE;
}

/** Maps a raw session user payload to the app's identity, or `null` if unusable. */
export function mapSessionUser(raw: unknown): SessionUser | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  const { id, name, email } = candidate;
  if (typeof id !== "string" || typeof name !== "string") return null;
  if (typeof email !== "string") return null;

  return {
    id,
    name,
    email,
    role: typeof candidate.role === "string" ? candidate.role : null,
  };
}

export interface SessionServiceDeps {
  api: AuthApiPort;
  storage: SessionTokenStorage;
}

/**
 * Orchestrates the session lifecycle (S13).
 *
 * The token itself is captured by the auth client's response hook, so this service
 * never writes it: it only clears it, which is the one transition a stale credential
 * must not survive. Kept free of React so the whole lifecycle is testable without a
 * renderer.
 */
export function createSessionService({
  api,
  storage,
}: SessionServiceDeps): SessionService {
  async function authenticate(result: AuthResult): Promise<SessionUser> {
    if (result.user) return result.user;
    throw new AuthenticationError(describeAuthFailure(result.error));
  }

  return {
    async signIn(input) {
      return authenticate(await api.signInEmail(input));
    },

    async signUp(input) {
      return authenticate(await api.signUpEmail(input));
    },

    /**
     * Always clears the local credential (S13): a network failure during sign-out
     * must never leave the device holding a token the user asked to drop. The server
     * session is revoked by the API call when it succeeds; when it does not, the row
     * survives until its expiry, which is why S25 records that lifetime.
     */
    async signOut() {
      try {
        await api.signOut();
      } catch {
        // Ignored on purpose: the local credential is cleared below either way.
      }
      await storage.clear();
    },

    /**
     * Cold-start restore.
     *
     * A server answer without a session clears the token; an unreachable server does
     * not, because "offline" is not "signed out" and the credential is still valid.
     */
    async restore() {
      let result: AuthResult;
      try {
        result = await api.getSession();
      } catch {
        return null;
      }

      if (result.user) return result.user;

      const rejected =
        !result.error ||
        result.error.status === 401 ||
        result.error.code === "SESSION_EXPIRED";
      if (rejected) await storage.clear();

      return null;
    },
  };
}
