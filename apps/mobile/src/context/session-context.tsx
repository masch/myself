import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { sessionService } from "@/infrastructure/auth/session-service-instance";
import type {
  SessionRestore,
  SessionRestoreProblem,
  SessionService,
  SessionUser,
  SignInInput,
  SignUpInput,
} from "@/infrastructure/auth/session-service";

/**
 * The session provider that replaces the device-local profile switcher (S13).
 *
 * It owns exactly one piece of state — the signed-in identity — and exposes the
 * transitions around it. Everything that needs "who is using the app right now" reads
 * `useSession().user`: local writes use `user.id`, the root gate uses `user`, and
 * Settings offers sign-out. There is no second source of identity anywhere.
 *
 * Since T6c the provider also owns the launch's failure state (M1, M2): a restore that
 * cannot reach an answer leaves the gate in `unavailable`, which keeps the stored token,
 * shows a retry and offers a way to sign in anyway. Neither a deadline nor an unreachable
 * server may be rendered as "signed out".
 */
export interface SessionContextValue {
  /** The signed-in identity, or `null` when nobody is signed in. */
  user: SessionUser | null;
  /** True while the stored session is still being restored on cold start. */
  isLoading: boolean;
  /**
   * Set when the last restore could not judge the stored credential: offline, past its
   * deadline or a server-side failure. The token is kept and the gate offers a retry.
   */
  restoreProblem: SessionRestoreProblem | null;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Runs the restore again from the retry state (T6c `M1`, `M2`). */
  retryRestore: () => void;
  /** Leaves the retry state for the auth tree, for a user who would rather sign in. */
  signInAnyway: () => void;
}

/** Message for the one failure the service itself cannot classify. */
const RESTORE_FAILED_MESSAGE =
  "Your session could not be restored. Try again, or sign in again.";

/**
 * How the provider hears that the app came back to the foreground (T6c `m6`).
 *
 * Returns its own unsubscribe, so the provider never holds a subscription it cannot drop.
 */
export type ForegroundSubscription = (onForeground: () => void) => () => void;

/**
 * The real subscription: React Native's `AppState` reports `active` when the app returns
 * from the background, which is when a session may have expired while nobody was looking.
 */
const subscribeToAppForeground: ForegroundSubscription = (onForeground) => {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") onForeground();
  });

  return () => subscription.remove();
};

const SessionContext = createContext<SessionContextValue | null>(null);

export interface SessionProviderProps {
  children: ReactNode;
  /** Test seam: the app passes its single service instance. */
  service?: SessionService;
  /** Test seam: the foreground source, defaulting to React Native's `AppState`. */
  subscribeToForeground?: ForegroundSubscription;
}

export function SessionProvider({
  children,
  service = sessionService,
  subscribeToForeground = subscribeToAppForeground,
}: SessionProviderProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreProblem, setRestoreProblem] =
    useState<SessionRestoreProblem | null>(null);
  // A restore that settles after unmount must not write state; the flag covers every
  // write below, including the loading flag itself.
  const isActive = useRef(true);
  // The newest restore is the only one allowed to write state (T6c `R3-1`). Retry presses
  // can overlap, and a slow earlier attempt settling after a later one authenticated used
  // to drop the gate back to `unavailable`, so the outcome depended on settlement order.
  const restoreGeneration = useRef(0);

  /** Writes one restore outcome into state, unless it is no longer the current one. */
  const applyOutcome = useCallback(
    (outcome: SessionRestore, generation: number) => {
      if (!isActive.current) return;
      if (generation !== restoreGeneration.current) return;

      if (outcome.status === "authenticated") {
        setUser(outcome.user);
        setRestoreProblem(null);
      } else if (outcome.status === "unauthenticated") {
        setUser(null);
        setRestoreProblem(null);
      } else {
        setUser(null);
        setRestoreProblem({ reason: outcome.reason, message: outcome.message });
      }

      setIsLoading(false);
    },
    [],
  );

  const runRestore = useCallback(() => {
    // Every start supersedes whatever is still in flight.
    const generation = (restoreGeneration.current += 1);

    return service.restore().then(
      (outcome) => applyOutcome(outcome, generation),
      (error: unknown) => {
        // `restore()` reports its own failures, so reaching this means the service itself
        // is broken. It still must not open the authenticated tree, and it still offers a
        // retry, so it lands on the same state an unreachable server does.
        console.warn("[session] Failed to restore the stored session:", error);
        applyOutcome(
          {
            status: "unavailable",
            reason: "server-error",
            message: RESTORE_FAILED_MESSAGE,
          },
          generation,
        );
      },
    );
  }, [service, applyOutcome]);

  useEffect(() => {
    isActive.current = true;

    return () => {
      isActive.current = false;
    };
  }, []);

  useEffect(() => {
    void runRestore();
  }, [runRestore]);

  // The identity a foreground check has to re-check, read without re-subscribing to the
  // foreground on every session change.
  const currentUser = useRef<SessionUser | null>(null);

  useEffect(() => {
    currentUser.current = user;
  }, [user]);

  /**
   * Re-checks the stored session when the app returns to the foreground (T6c `m6`).
   *
   * A session expires on the server (seven days by default, S25) while the process keeps
   * rendering the identity it restored: every server call then answers 401 and the UI still
   * claims the user is signed in. This is the cheapest correct revalidation — no timer, no
   * polling, one request per return to the foreground — and it acts only on answers that
   * judge the credential: a session the server still accepts refreshes the identity, a
   * rejected one signs the tree out, and a server that could not answer changes nothing,
   * because offline is not signed out (`M2`) and must not take a working tree away.
   */
  const revalidate = useCallback(() => {
    if (!currentUser.current) return;

    const generation = (restoreGeneration.current += 1);

    void service.restore().then(
      (outcome) => {
        if (!isActive.current) return;
        if (generation !== restoreGeneration.current) return;
        if (outcome.status === "unavailable") return;
        applyOutcome(outcome, generation);
      },
      (error: unknown) => {
        // A revalidation is never allowed to disturb the tree: it is a check, and the
        // session it was checking is still the one the user is using.
        console.warn("[session] Failed to re-check the stored session:", error);
      },
    );
  }, [service, applyOutcome]);

  useEffect(
    () => subscribeToForeground(revalidate),
    [subscribeToForeground, revalidate],
  );

  const signIn = useCallback(
    async (input: SignInInput) => {
      setUser(await service.signIn(input));
      setRestoreProblem(null);
    },
    [service],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      setUser(await service.signUp(input));
      setRestoreProblem(null);
    },
    [service],
  );

  const signOut = useCallback(async () => {
    try {
      await service.signOut();
    } finally {
      // The stored token is already gone at this point — the service clears it before it
      // asks the server to revoke anything (T6c `m2`) — so clearing the state is what moves
      // the gate back to the auth tree, and it happens even if the local clear failed.
      setUser(null);
      setRestoreProblem(null);
    }
  }, [service]);

  const retryRestore = useCallback(() => {
    // Set here, not in the effect that calls the restore: the launch already starts
    // loading, and a synchronous `setState` inside an effect only causes a cascading
    // render. A retry happens from a press, so it can enter the loading state directly.
    setIsLoading(true);
    void runRestore();
  }, [runRestore]);

  const signInAnyway = useCallback(() => {
    setRestoreProblem(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      isLoading,
      restoreProblem,
      signIn,
      signUp,
      signOut,
      retryRestore,
      signInAnyway,
    }),
    [
      user,
      isLoading,
      restoreProblem,
      signIn,
      signUp,
      signOut,
      retryRestore,
      signInAnyway,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
