import { describe, expect, it } from "bun:test";
import {
  keyboardInsetFromViewport,
  subscribeToKeyboardInset,
  type ViewportWindow,
} from "../use-keyboard-inset";

/**
 * On the web the software keyboard may only shrink the visual viewport
 * (`interactive-widget=resizes-visual`, which is still the default outside
 * Chromium on Android). Everything with `height: 100%` keeps the full screen
 * height, so a scrollable list believes it can draw behind the keyboard and the
 * focused input plus the results under it end up hidden.
 *
 * The inset is what the list has to reserve at the bottom for the focused field
 * to be reachable. It is derived from the two viewports the browser reports.
 */
describe("keyboardInsetFromViewport", () => {
  it("returns the height the keyboard steals from the visual viewport", () => {
    expect(
      keyboardInsetFromViewport({ layoutHeight: 800, visualHeight: 460 }),
    ).toBe(340);
  });

  it("returns zero when the layout viewport already shrank with the keyboard", () => {
    // `interactive-widget=resizes-content` on Chromium: innerHeight follows the
    // visual viewport, so reserving space again would double the padding.
    expect(
      keyboardInsetFromViewport({ layoutHeight: 460, visualHeight: 460 }),
    ).toBe(0);
  });

  it("returns zero when the visual viewport is taller than the layout one, instead of a negative inset", () => {
    expect(
      keyboardInsetFromViewport({ layoutHeight: 460, visualHeight: 800 }),
    ).toBe(0);
  });
});

/**
 * Minimal stand-in for `window` and `window.visualViewport`: the subscription is
 * taken against the object it receives, so it can be driven without a DOM.
 */
function createFakeWindow(layoutHeight: number, visualHeight: number) {
  const listeners = new Map<string, Set<() => void>>();
  const target = {
    addEventListener(type: string, listener: () => void) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
  };

  const visualViewport = {
    height: visualHeight,
    addEventListener: target.addEventListener,
    removeEventListener: target.removeEventListener,
  };

  const win = {
    innerHeight: layoutHeight,
    visualViewport,
    addEventListener: target.addEventListener,
    removeEventListener: target.removeEventListener,
  } satisfies ViewportWindow;

  const emit = (type: string) => {
    for (const listener of listeners.get(type) ?? []) listener();
  };

  return {
    win,
    listeners,
    /** Simulate the keyboard opening or closing to `height` CSS pixels. */
    setVisualHeight(height: number) {
      visualViewport.height = height;
      emit("resize");
    },
  };
}

describe("subscribeToKeyboardInset", () => {
  it("emits the current inset before any event, so the first paint is correct", () => {
    const fake = createFakeWindow(800, 800);
    const seen: number[] = [];

    const unsubscribe = subscribeToKeyboardInset(fake.win, (inset) =>
      seen.push(inset),
    );
    unsubscribe();

    expect(seen).toEqual([0]);
  });

  it("emits again on every visual viewport resize while the keyboard opens and closes", () => {
    const fake = createFakeWindow(800, 800);
    const seen: number[] = [];

    const unsubscribe = subscribeToKeyboardInset(fake.win, (inset) =>
      seen.push(inset),
    );
    fake.setVisualHeight(460);
    fake.setVisualHeight(800);
    unsubscribe();

    expect(seen).toEqual([0, 340, 0]);
  });

  it("stops emitting once unsubscribed, and releases the viewport listener", () => {
    const fake = createFakeWindow(800, 800);
    const seen: number[] = [];

    const unsubscribe = subscribeToKeyboardInset(fake.win, (inset) =>
      seen.push(inset),
    );
    unsubscribe();
    fake.setVisualHeight(460);

    expect(seen).toEqual([0]);
    expect(fake.listeners.get("resize")?.size ?? 0).toBe(0);
  });
});
