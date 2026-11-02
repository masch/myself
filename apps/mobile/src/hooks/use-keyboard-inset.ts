import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * How much of the window the software keyboard covers, in CSS pixels.
 *
 * Native builds do not need this: the OS resizes (or pans) the window and
 * `ScrollScreenContainer` owns its own keyboard math. On the web the browser may
 * shrink only the *visual* viewport, leaving every `height: 100%` container at
 * the full screen height — the reason a focused search field and the results
 * under it can end up behind the keyboard.
 */
export interface KeyboardViewport {
  /** Layout viewport height, i.e. `window.innerHeight`. */
  layoutHeight: number;
  /** Visible height, i.e. `window.visualViewport.height`. */
  visualHeight: number;
}

/**
 * The space the keyboard steals from the visual viewport, clamped so a racing
 * rotation cannot produce a negative inset.
 *
 * Chromium on Android honours `interactive-widget=resizes-content` (declared in
 * `src/app/+html.tsx`): the layout viewport shrinks with the keyboard, this
 * difference stays at zero and nothing is reserved twice. Browsers that ignore
 * that hint — WebKit, today — keep the layout viewport tall and get the real
 * inset here.
 */
export function keyboardInsetFromViewport({
  layoutHeight,
  visualHeight,
}: KeyboardViewport): number {
  return Math.max(0, Math.round(layoutHeight - visualHeight));
}

interface ViewportTarget {
  addEventListener(type: "resize", listener: () => void): void;
  removeEventListener(type: "resize", listener: () => void): void;
}

export interface ViewportWindow extends ViewportTarget {
  innerHeight: number;
  visualViewport: (ViewportTarget & { height: number }) | null;
}

function readKeyboardInset(win: ViewportWindow): number {
  return keyboardInsetFromViewport({
    layoutHeight: win.innerHeight,
    visualHeight: win.visualViewport?.height ?? win.innerHeight,
  });
}

/**
 * Reports the keyboard inset now and on every viewport resize until the returned
 * function is called. The window is a parameter instead of a global so the
 * subscription can be driven by a fake in tests, where there is no DOM.
 */
export function subscribeToKeyboardInset(
  win: ViewportWindow,
  onChange: (inset: number) => void,
): () => void {
  const notify = () => onChange(readKeyboardInset(win));
  const target: ViewportTarget = win.visualViewport ?? win;

  // Emitted before any event so the first paint already reserves the space: the
  // keyboard can open before the listener is attached.
  notify();
  target.addEventListener("resize", notify);

  return () => target.removeEventListener("resize", notify);
}

/**
 * Web-only keyboard inset for screens that scroll their own virtualised list
 * instead of using `ScreenContainer.Scroll`.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    return subscribeToKeyboardInset(
      window as unknown as ViewportWindow,
      setInset,
    );
  }, []);

  return inset;
}
