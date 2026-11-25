import type { SessionUser } from "@/infrastructure/auth/session-service";

/**
 * What the root layout may render (S13).
 *
 * Kept as a pure derivation, not a component, so the three states the gate exists to
 * distinguish are testable without a renderer: still restoring the stored session,
 * signed in, signed out.
 */
export type SessionGateState = "loading" | "authenticated" | "unauthenticated";

export interface SessionGateInput {
  isLoading: boolean;
  user: SessionUser | null;
}

export function deriveSessionGate(input: SessionGateInput): SessionGateState {
  // Loading wins over both: rendering the auth tree while a stored session is still
  // being restored would flash the sign-in form at a signed-in user on every launch.
  if (input.isLoading) return "loading";
  return input.user ? "authenticated" : "unauthenticated";
}
