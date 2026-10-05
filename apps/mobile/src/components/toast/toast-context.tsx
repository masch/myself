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

      const duration = options.duration ?? 4000;
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

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
