import { describe, expect, it } from "bun:test";
import {
  resolveNativeKeyboardInset,
  resolveSoftwareKeyboardInset,
  subscribeToNativeKeyboardHeight,
  type KeyboardEventSource,
} from "../use-software-keyboard-inset";

/**
 * On Android an Expo app is edge-to-edge, so the window no longer resizes when
 * the software keyboard opens: it is painted over a full-height window, and the
 * app has to reserve the covered space itself. `Keyboard`'s events are the only
 * source for it on native.
 *
 * These are the rules, as plain functions: the repo has no React renderer, so the
 * hook is an adapter and the decisions are what gets pinned.
 */

type Emit = (payload: { endCoordinates: { height: number } }) => void;

/** A `Keyboard` module stand-in that records its listeners and can fire them. */
function createKeyboardSource() {
  const listeners = new Map<string, Set<Emit>>();
  const removals: string[] = [];

  const source: KeyboardEventSource = {
    addListener(event, listener) {
      const bucket = listeners.get(event) ?? new Set<Emit>();
      bucket.add(listener as Emit);
      listeners.set(event, bucket);

      return {
        remove() {
          removals.push(event);
          bucket.delete(listener as Emit);
        },
      };
    },
  };

  return {
    source,
    removals,
    emit(event: "keyboardDidShow" | "keyboardDidHide", height: number) {
      for (const listener of listeners.get(event) ?? []) {
        listener({ endCoordinates: { height } });
      }
    },
    listenerCount(event: "keyboardDidShow" | "keyboardDidHide") {
      return listeners.get(event)?.size ?? 0;
    },
  };
}

describe("resolveNativeKeyboardInset", () => {
  it("reserves exactly the height the platform reported", () => {
    expect(resolveNativeKeyboardInset(300)).toBe(300);
    expect(resolveNativeKeyboardInset(311)).toBe(311);
  });

  it("adds nothing for the Android navigation bar, which the container already reserves", () => {
    // React Native reports the keyboard *above* the navigation bar, and every
    // container adds `insets.bottom` once through its bottom safe-area edge. The
    // covered space is `safe area + keyboard`; adding the bar here as well
    // reserved it twice and pushed the last row half a bar too far. The pin cannot
    // see the container from here, so it pins the rule: no addition.
    expect(resolveNativeKeyboardInset(300)).not.toBe(300 + 48);
  });

  it("reserves nothing while the keyboard is closed", () => {
    expect(resolveNativeKeyboardInset(0)).toBe(0);
  });

  it("never reports a negative inset", () => {
    expect(resolveNativeKeyboardInset(-120)).toBe(0);
  });
});

describe("subscribeToNativeKeyboardHeight", () => {
  it("reports the height the keyboard event carries, not a constant", () => {
    const keyboard = createKeyboardSource();
    const heights: number[] = [];

    subscribeToNativeKeyboardHeight(keyboard.source, (height) =>
      heights.push(height),
    );

    keyboard.emit("keyboardDidShow", 311);
    keyboard.emit("keyboardDidHide", 0);
    keyboard.emit("keyboardDidShow", 277);

    expect(heights).toEqual([311, 0, 277]);
  });

  it("stops reporting once the returned function is called", () => {
    const keyboard = createKeyboardSource();
    const heights: number[] = [];

    const unsubscribe = subscribeToNativeKeyboardHeight(
      keyboard.source,
      (height) => heights.push(height),
    );

    keyboard.emit("keyboardDidShow", 300);
    unsubscribe();
    keyboard.emit("keyboardDidHide", 0);

    expect(heights).toEqual([300]);
    expect(keyboard.listenerCount("keyboardDidShow")).toBe(0);
    expect(keyboard.listenerCount("keyboardDidHide")).toBe(0);
  });
});

describe("resolveSoftwareKeyboardInset", () => {
  it("uses the visual-viewport inset on the web", () => {
    expect(
      resolveSoftwareKeyboardInset({
        platform: "web",
        webInset: 280,
        nativeInset: 0,
      }),
    ).toBe(280);
  });

  it("uses the keyboard-event inset on native, never the browser one", () => {
    // A stale web inset must not reach a native build: the two sources describe
    // different windows and adding them would double the reservation.
    expect(
      resolveSoftwareKeyboardInset({
        platform: "android",
        webInset: 280,
        nativeInset: 348,
      }),
    ).toBe(348);
    expect(
      resolveSoftwareKeyboardInset({
        platform: "ios",
        webInset: 280,
        nativeInset: 300,
      }),
    ).toBe(300);
  });
});
