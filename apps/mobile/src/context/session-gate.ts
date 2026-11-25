import type {
  SessionRestoreProblem,
  SessionUser,
} from "@/infrastructure/auth/session-service";

/**
 * What the root layout may render (S13).
 *
 * Kept as a pure derivation, not a component, so the states the gate exists to distinguish
 * are testable without a renderer: still restoring the stored session, signed in, signed
 * out, and — since T6c `M2` — a restore that could not answer at all.
 */
export type SessionGateState =
  "loading" | "authenticated" | "unauthenticated" | "unavailable";

export interface SessionGateInput {
  isLoading: boolean;
  user: SessionUser | null;
  /**
   * Set when the last restore ended without judging the stored credential: offline, past
   * its deadline or a server-side failure (T6c `M1`, `M2`). The token is still stored.
   */
  restoreProblem?: SessionRestoreProblem | null;
}

export function deriveSessionGate(input: SessionGateInput): SessionGateState {
  // Loading wins over both: rendering the auth tree while a stored session is still
  // being restored would flash the sign-in form at a signed-in user on every launch.
  if (input.isLoading) return "loading";
  // A resolved session wins over a stale problem: a retry that succeeded clears it anyway,
  // but the ordering makes an authenticated tree unreachable by an offline state.
  if (input.user) return "authenticated";
  // Offline is not signed out: the credential is still stored and the session is unknown,
  // so the gate offers a retry instead of claiming the browser has no session.
  if (input.restoreProblem) return "unavailable";
  return "unauthenticated";
}
