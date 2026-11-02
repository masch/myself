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
  /** How far the browser panned the visual viewport, i.e. `offsetTop`. Defaults to `0`. */
  visualOffsetTop?: number;
  /** Pinch zoom factor, i.e. `visualViewport.scale`. Defaults to `1`. */
  visualScale?: number;
}

/**
 * The space the keyboard steals from the visual viewport, clamped so a racing
 * rotation cannot produce a negative inset.
 *
 * Chrome with `interactive-widget=resizes-content` shrinks the layout viewport
 * with the keyboard, so this difference stays at zero and nothing is reserved
 * twice; browsers that ignore that hint keep the layout viewport tall and get the
 * real inset here.
 *
 * Pinch zoom also shrinks the visual viewport, but nothing is covering it.
 * Reserving that space would lift every sheet and pad every list by hundreds of
 * pixels, so a zoomed viewport reports no inset and the browser's own scrolling
 * carries the field into view — the known limit of measuring a keyboard this way.
 */
export function keyboardInsetFromViewport({
  layoutHeight,
  visualHeight,
  visualOffsetTop = 0,
  visualScale = 1,
}: KeyboardViewport): number {
  if (visualScale !== 1) return 0;

  return Math.max(
    0,
    Math.round(layoutHeight - (visualOffsetTop + visualHeight)),
  );
}

interface ViewportTarget {
  addEventListener(type: "resize" | "scroll", listener: () => void): void;
  removeEventListener(type: "resize" | "scroll", listener: () => void): void;
}

export interface ViewportWindow extends ViewportTarget {
  innerHeight: number;
  visualViewport:
    | (ViewportTarget & { height: number; offsetTop?: number; scale?: number })
    | null;
}

function readKeyboardInset(win: ViewportWindow): number {
  return keyboardInsetFromViewport({
    layoutHeight: win.innerHeight,
    visualHeight: win.visualViewport?.height ?? win.innerHeight,
    visualOffsetTop: win.visualViewport?.offsetTop,
    visualScale: win.visualViewport?.scale,
  });
}

/**
 * Reports the keyboard inset now and whenever the viewport changes until the
 * returned function is called. The window is a parameter instead of a global so
 * the subscription can be driven by a fake in tests, where there is no DOM.
 */
export function subscribeToKeyboardInset(
  win: ViewportWindow,
  onChange: (inset: number) => void,
): () => void {
  let lastInset: number | null = null;
  // One geometry can arrive as both a resize and a scroll; reporting it twice
  // would re-render every consumer for the same numbers.
  const notify = () => {
    const inset = readKeyboardInset(win);
    if (inset === lastInset) return;

    lastInset = inset;
    onChange(inset);
  };

  const target: ViewportTarget = win.visualViewport ?? win;
  const events: ("resize" | "scroll")[] = win.visualViewport
    ? ["resize", "scroll"]
    : ["resize"];

  // Emitted before any event so the first paint already reserves the space: the
  // keyboard can open before the listener is attached.
  notify();
  for (const event of events) target.addEventListener(event, notify);

  return () => {
    for (const event of events) target.removeEventListener(event, notify);
  };
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
