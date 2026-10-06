import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ToastAction, ToastContextValue, ToastOptions } from "./types";
import { ToastBanner } from "./toast-banner";

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provides toast controls and renders one active toast, replacing any previous
 * toast when shown. Defaults to dismissal after 4 seconds (or 8 seconds if an
 * interactive action is provided); nonpositive durations keep the toast visible
 * until dismissed or replaced.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrentToast(null);
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setCurrentToast(options);

      const defaultDuration = options.action ? 8000 : 4000;
      const duration = options.duration ?? defaultDuration;
      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          hide();
        }, duration);
      }
    },
    [hide],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const success = useCallback(
    (message: string, action?: ToastAction) => {
      show({ message, variant: "success", action });
    },
    [show],
  );

  const error = useCallback(
    (message: string, action?: ToastAction) => {
      show({ message, variant: "destructive", action });
    },
    [show],
  );

  const undo = useCallback(
    (message: string, onUndo: () => void) => {
      show({
        message,
        action: {
          label: "Deshacer",
          onPress: onUndo,
        },
      });
    },
    [show],
  );

  return (
    <ToastContext.Provider value={{ show, hide, success, error, undo }}>
      {children}
      <ToastBanner toast={currentToast} onDismiss={hide} />
    </ToastContext.Provider>
  );
}

/**
 * Returns the nearest provider's show, hide, success, error, and undo controls.
 * @throws {Error} When called outside a ToastProvider.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
