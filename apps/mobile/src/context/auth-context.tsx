import type { SessionUser } from "@/infrastructure/auth/session-service";
import { useSession } from "./session-context";

/**
 * Compatibility bridge for the reflection hooks, which still ask for `currentUser`.
 *
 * T6a replaced the device-local profile switcher with the session (S13), and the
 * reflection screens (`use-daily-reflections`, `use-theme-cohort`) are outside this
 * task's edit surface, so they keep the old call shape for now. The value is derived
 * from the session, never from the local profile list: there is still exactly one
 * source of identity, and `currentUser.id` is `session.user.id`.
 *
 * Follow-up: move those two hooks to `useSession()` and delete this file.
 */
export function useAuth(): { currentUser: SessionUser | null } {
  const { user } = useSession();
  return { currentUser: user };
}
