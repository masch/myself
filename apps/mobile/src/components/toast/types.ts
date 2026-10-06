export type ToastVariant = "default" | "success" | "warning" | "destructive";

export interface ToastAction {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

export interface ToastOptions {
  id?: string;
  message: string;
  action?: ToastAction;
  duration?: number;
  variant?: ToastVariant;
}

export interface ToastContextValue {
  show: (options: ToastOptions) => void;
  hide: () => void;
  success: (message: string, action?: ToastAction) => void;
  error: (message: string, action?: ToastAction) => void;
  undo: (message: string, onUndo: () => void) => void;
}
