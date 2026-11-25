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

/**
 * The local credential store refused the write (T6c `m7`).
 *
 * A client-side code, not an API one: nothing about the request failed. It exists because
 * a keychain failure used to arrive as a transport failure, and the message then told the
 * user to check a connection that had just carried a successful sign-in.
 */
export const SESSION_TOKEN_STORAGE_FAILURE = "SESSION_TOKEN_STORAGE_FAILED";

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
  // The sign-in worked and the device cannot remember it. This is deliberately not the
  // "check your connection" text: the connection is the one thing that did its job.
  [SESSION_TOKEN_STORAGE_FAILURE]:
    "You're signed in, but this device could not save your session, so it will not survive a restart. Check this device's keychain access and try again.",
};

/**
 * Turns a failed auth response into text a person can act on.
 *
 * A `status` of 0 means no response arrived at all (the transport failed), which is
 * the one failure whose cause the user can fix themselves. A local-storage failure has no
 * status at all and carries its own code, so it is read from the code table instead of
 * being mistaken for a connection problem (T6c `m7`).
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
  /** Test seam: how long a best-effort revoke may stay unanswered (T6c `m2`). */
  revokeDeadlineMs?: number;
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

/**
 * How long the best-effort revoke of a sign-out may stay unanswered (T6c `m2`).
 *
 * Deliberately smaller than the restore deadline: the local sign-out has already happened
 * by the time the request leaves, so this only bounds how long the caller waits to learn
 * that the server was told.
 */
export const SIGN_OUT_REVOKE_DEADLINE_MS = 5_000;

/** How one restore call ended, before it is read as a session state. */
type RestoreAttempt =
  | { kind: "answer"; result: AuthResult }
  | { kind: "threw" }
  | { kind: "deadline" };

/**
 * Runs `operation` and settles no later than `deadlineMs`.
 *
 * Three invariants, all needed by its two callers (`M1`, `m2`): a synchronous throw inside
 * `operation` becomes a failed attempt instead of escaping the timer; both handlers are
 * attached before the deadline can win, so an abandoned request never becomes an
 * unhandled rejection; and the deadline **resolves** with `onFailure("deadline")` instead
 * of rejecting, because an unanswered request is a state the caller shows or records, not
 * an error it has to catch.
 */
function bounded<T>(
  operation: () => Promise<T>,
  deadlineMs: number,
  onFailure: (cause: "deadline" | "error") => T,
): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (value: T) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };

    timer = setTimeout(() => settle(onFailure("deadline")), deadlineMs);

    Promise.resolve()
      .then(operation)
      .then(settle, () => settle(onFailure("error")));
  });
}

/** Calls `getSession` and gives up after `deadlineMs`. */
function attemptRestore(
  api: AuthApiPort,
  deadlineMs: number,
): Promise<RestoreAttempt> {
  return bounded(
    () =>
      api
        .getSession()
        .then<RestoreAttempt>((result) => ({ kind: "answer", result })),
    deadlineMs,
    (cause) =>
      cause === "deadline" ? { kind: "deadline" } : { kind: "threw" },
  );
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
  revokeDeadlineMs = SIGN_OUT_REVOKE_DEADLINE_MS,
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
     * Signs out (T6c `m2`).
     *
     * The local decision is authoritative and comes first: the stored token is cleared
     * before anything is asked of the server, so an interruption between the two can never
     * leave a live credential on the device while the UI shows the signed-in tree.
     *
     * The revoke is best-effort afterwards — bounded by its own deadline and swallowing
     * both a failure and an unanswered request — so it can neither block the local
     * sign-out nor fail the caller's cleanup. A session the server never revoked survives
     * until its expiry, which is why S25 records the lifetime. A failure of the local clear
     * itself still propagates: that is the one outcome the caller must not mistake for a
     * completed sign-out.
     */
    async signOut() {
      await storage.clear();
      await bounded(
        () => api.signOut().then(() => undefined),
        revokeDeadlineMs,
        () => undefined,
      );
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
