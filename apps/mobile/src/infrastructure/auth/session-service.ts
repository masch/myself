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
 * Why a restore could not judge the stored credential (T6c `M2`).
 *
 * `offline` is a transport failure (no response at all), `timeout` is the restore
 * outliving its deadline (T6c `M1`) and `server-error` is a response from a server that
 * failed before it could answer the question — none of the three is a rejection of the
 * credential, so none of them may be rendered as "signed out".
 */
export type SessionRestoreProblemReason =
  "offline" | "timeout" | "server-error";

/** The state the root gate shows with a retry affordance. */
export interface SessionRestoreProblem {
  reason: SessionRestoreProblemReason;
  message: string;
}

/**
 * What a cold-start restore found.
 *
 * Three outcomes, not two (T6c `M2`): a stored session the server still accepts, a
 * credential the server rejected (or an explicit "no session"), and a session the app
 * could not check at all. The third keeps the token and is the one the gate must offer a
 * retry for, because asking a user with a valid session for a password does not work
 * against a server that is not answering.
 */
export type SessionRestore =
  | { status: "authenticated"; user: SessionUser }
  | { status: "unauthenticated" }
  | ({ status: "unavailable" } & SessionRestoreProblem);

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
  restore(): Promise<SessionRestore>;
}

const GENERIC_FAILURE = "Authentication failed. Please try again.";
const UNREACHABLE_SERVER =
  "Could not reach the server. Check your connection and try again.";
const RESTORE_TIMED_OUT =
  "The server did not answer in time. Check your connection and try again.";

/** A response-less failure: the transport never reached the server. */
const NO_RESPONSE_STATUS = 0;

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
  if (failure.status === NO_RESPONSE_STATUS) return UNREACHABLE_SERVER;
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
  /** Test seam: how long a restore may stay unanswered (T6c `M1`). */
  restoreDeadlineMs?: number;
}

/**
 * The hard deadline of a cold-start restore (T6c `M1`).
 *
 * The auth client already aborts its own request after `AUTH_REQUEST_TIMEOUT_MS` (10 s,
 * the same budget the app's HTTP client uses), so this deadline should only fire when the
 * transport ignores its abort. It is larger than that budget for exactly that reason, and
 * it is the guarantee that a launch can never be stuck on the loading screen: the gate
 * leaves `loading` even if the restore promise never settles.
 */
export const RESTORE_DEADLINE_MS = 15_000;

/** How one restore call ended, before it is read as a session state. */
type RestoreAttempt =
  | { kind: "answer"; result: AuthResult }
  | { kind: "threw" }
  | { kind: "deadline" };

/**
 * Calls `getSession` and gives up after `deadlineMs`.
 *
 * The deadline resolves instead of rejecting on purpose: an unanswered restore is a state
 * the gate can show, not an error it has to catch.
 */
function attemptRestore(
  api: AuthApiPort,
  deadlineMs: number,
): Promise<RestoreAttempt> {
  return new Promise<RestoreAttempt>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (attempt: RestoreAttempt) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(attempt);
    };

    timer = setTimeout(() => settle({ kind: "deadline" }), deadlineMs);

    // Started inside a chain so a synchronous throw cannot escape the deadline, and with
    // both handlers attached so an abandoned request cannot become an unhandled rejection.
    Promise.resolve()
      .then(() => api.getSession())
      .then(
        (result) => settle({ kind: "answer", result }),
        () => settle({ kind: "threw" }),
      );
  });
}

/** Reads one attempt as the session state it means (T6c `M2`). */
function classifyRestore(attempt: RestoreAttempt): SessionRestore {
  if (attempt.kind === "deadline") {
    return {
      status: "unavailable",
      reason: "timeout",
      message: RESTORE_TIMED_OUT,
    };
  }

  if (attempt.kind === "threw") {
    // Defensive: `auth-client.ts` converts every transport throw into the status-0 answer
    // below, so this branch only runs for a port that throws. It never judged the stored
    // credential, so it is "unreachable", never "signed out".
    return {
      status: "unavailable",
      reason: "offline",
      message: UNREACHABLE_SERVER,
    };
  }

  const { result } = attempt;
  if (result.user) return { status: "authenticated", user: result.user };

  const failure = result.error;
  // No error at all is the server's explicit answer: this credential has no session.
  if (!failure) return { status: "unauthenticated" };

  const rejected = failure.status === 401 || failure.code === "SESSION_EXPIRED";
  if (rejected) return { status: "unauthenticated" };

  if (failure.status === NO_RESPONSE_STATUS) {
    return {
      status: "unavailable",
      reason: "offline",
      message: UNREACHABLE_SERVER,
    };
  }

  // A server that answered and failed judged no credential: keep it and let the user retry.
  return {
    status: "unavailable",
    reason: "server-error",
    message: describeAuthFailure(failure),
  };
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
  restoreDeadlineMs = RESTORE_DEADLINE_MS,
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
     * Cold-start restore (T6c `M1`, `M2`).
     *
     * Only a rejection of the credential — a 401, an expired session, or an explicit
     * "no session" answer — clears the token. An unreachable server, a deadline and a
     * server-side failure keep it and report `unavailable`, because offline is not signed
     * out and the credential is still worth keeping.
     */
    async restore() {
      const outcome = classifyRestore(
        await attemptRestore(api, restoreDeadlineMs),
      );

      if (outcome.status === "unauthenticated") await storage.clear();

      return outcome;
    },
  };
}
