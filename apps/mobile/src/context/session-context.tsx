import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { sessionService } from "@/infrastructure/auth/session-service-instance";
import type {
  SessionService,
  SessionUser,
  SignInInput,
  SignUpInput,
} from "@/infrastructure/auth/session-service";

/**
 * The session provider that replaces the device-local profile switcher (S13).
 *
 * It owns exactly one piece of state — the signed-in identity — and exposes the four
 * transitions around it. Everything that needs "who is using the app right now" reads
 * `useSession().user`: local writes use `user.id`, the root gate uses `user`, and
 * Settings offers sign-out. There is no second source of identity anywhere.
 */
export interface SessionContextValue {
  /** The signed-in identity, or `null` when nobody is signed in. */
  user: SessionUser | null;
  /** True while the stored session is still being restored on cold start. */
  isLoading: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export interface SessionProviderProps {
  children: ReactNode;
  /** Test seam: the app passes its single service instance. */
  service?: SessionService;
}

export function SessionProvider({
  children,
  service = sessionService,
}: SessionProviderProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    service
      .restore()
      .then((restored) => {
        if (isActive) setUser(restored);
      })
      .catch((error: unknown) => {
        // A restore failure is "no session for this launch", never a crash: the gate
        // then offers sign-in, which is the recoverable state.
        console.warn("[session] Failed to restore the stored session:", error);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [service]);

  const signIn = useCallback(
    async (input: SignInInput) => {
      setUser(await service.signIn(input));
    },
    [service],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      setUser(await service.signUp(input));
    },
    [service],
  );

  const signOut = useCallback(async () => {
    try {
      await service.signOut();
    } finally {
      // The local token is already gone at this point (the service clears it in a
      // `finally` of its own); clearing the state is what moves the gate back to the
      // auth tree, and it must happen even if the keychain write failed.
      setUser(null);
    }
  }, [service]);

  const value = useMemo<SessionContextValue>(
    () => ({ user, isLoading, signIn, signUp, signOut }),
    [user, isLoading, signIn, signUp, signOut],
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
