import { resetPasswordUrl } from "./deep-links";
import { describeAuthFailure, type AuthFailure } from "./session-service";

/**
 * The two mail-driven password reset steps (S2, S13).
 *
 * Kept out of the session service on purpose: a reset request has no session and a
 * completed reset *ends* every session, so it is not a session transition. The flows still
 * share the failure vocabulary of `describeAuthFailure`, which is what keeps "wrong
 * password", "unreachable server" and "password too short" worded the same way everywhere.
 */
export interface AuthRequestOutcome {
  error: AuthFailure | null;
}

/** The narrow port this service needs from the auth client. */
export interface PasswordResetApiPort {
  requestPasswordReset(input: {
    email: string;
    redirectTo: string;
  }): Promise<AuthRequestOutcome>;
  resetPassword(input: {
    token: string;
    newPassword: string;
  }): Promise<AuthRequestOutcome>;
}

/**
 * What the forgot-password form can report.
 *
 * `sent` is deliberately address-agnostic (the API answers the same whether or not the
 * account exists), and `disabled` is its own outcome rather than a failure: a deployed
 * server with no email sender refuses the request, and claiming a mail was sent there
 * would be a lie with a user waiting for a link that cannot arrive (T4, S16).
 */
export type PasswordResetRequestOutcome =
  | { status: "sent" }
  | { status: "disabled"; message: string }
  | { status: "failed"; message: string };

export type PasswordResetOutcome =
  { status: "reset" } | { status: "failed"; message: string };

export interface PasswordResetService {
  request(email: string): Promise<PasswordResetRequestOutcome>;
  complete(token: string, newPassword: string): Promise<PasswordResetOutcome>;
}

/** Better Auth's code for "this server has no sendResetPassword function" (T4). */
export const RESET_PASSWORD_DISABLED = "RESET_PASSWORD_DISABLED";

const RESET_DISABLED_MESSAGE =
  "This server cannot send email yet, so no reset link was sent. Ask the operator to configure an email sender.";

/**
 * The reset flow's own wording for the codes it can see.
 *
 * `INVALID_TOKEN` covers both an expired link and one that was already used — the library
 * consumes the token on completion — so the message names both instead of guessing which.
 */
const RESET_FAILURES: Record<string, string> = {
  INVALID_TOKEN:
    "This reset link is no longer valid: it may have expired or already have been used. Request a new one.",
};

function describeResetFailure(failure: AuthFailure | null): string {
  const message = failure?.code ? RESET_FAILURES[failure.code] : undefined;
  return message ?? describeAuthFailure(failure);
}

export function createPasswordResetService({
  api,
}: {
  api: PasswordResetApiPort;
}): PasswordResetService {
  return {
    async request(email) {
      const { error } = await api.requestPasswordReset({
        email,
        // The server trusts exactly this origin (S13); it is where the reset token lands.
        redirectTo: resetPasswordUrl(),
      });

      if (!error) return { status: "sent" };
      if (error.code === RESET_PASSWORD_DISABLED) {
        return { status: "disabled", message: RESET_DISABLED_MESSAGE };
      }
      return { status: "failed", message: describeResetFailure(error) };
    },

    async complete(token, newPassword) {
      const { error } = await api.resetPassword({ token, newPassword });
      if (!error) return { status: "reset" };
      return { status: "failed", message: describeResetFailure(error) };
    },
  };
}
