import type { SessionUser } from "@/infrastructure/auth/session-service";

/**
 * What a reset or verification deep link means (S2, S13, S17).
 *
 * Pure readings of the link's own query parameters, kept out of the screens so the one
 * decision that matters — a missing token or an `error` must never be shown as success — is
 * testable without rendering, and so both landing screens translate a link the same way.
 */
export type LinkParams = Record<string, string | string[] | undefined>;

/** The first non-empty value of a parameter expo-router may hand over as an array. */
function first(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : null;
}

/**
 * The reset token a reset link carries, or `null` when it carries none.
 *
 * Better Auth's `GET /reset-password/:token` redirects to `redirectTo?token=…`, so the
 * token is in the app's own URL; a link without one is a link the app cannot complete.
 */
export function resetTokenFromParams(params: LinkParams): string | null {
  return first(params.token);
}

export type VerificationOutcome =
  { status: "verified" } | { status: "failed"; message: string };

/**
 * What the verification redirect reported (S17).
 *
 * The verification endpoint consumes the token itself and then redirects to the app's deep
 * link: **no** parameters means the address is verified (the token was accepted, or it was
 * already verified), and the library appends `error` on every failure path. So the absence
 * of an error is not an optimistic guess — it is the only success signal the protocol has,
 * and it can only come from a request that actually reached the server.
 */
export function verificationOutcomeFromParams(
  params: LinkParams,
): VerificationOutcome {
  const error = first(params.error);
  if (!error) return { status: "verified" };

  if (error === "TOKEN_EXPIRED") {
    return {
      status: "failed",
      message:
        "That verification link has expired. Sign in and request a new verification email.",
    };
  }

  if (error === "INVALID_TOKEN") {
    return {
      status: "failed",
      message:
        "That verification link is no longer valid: it may have expired or already have been used.",
    };
  }

  return {
    status: "failed",
    message: `Your email address could not be verified (${error}).`,
  };
}

/**
 * Where a landing screen sends the user next (S13).
 *
 * A landing surface must never strand anybody: a signed-in client goes back into the app,
 * and a signed-out one to the form it can act on. The target is the session's own answer
 * rather than a fixed route, because both screens are registered outside the gate.
 */
export function backToAppTarget(user: SessionUser | null): "/" | "/sign-in" {
  return user ? "/" : "/sign-in";
}
