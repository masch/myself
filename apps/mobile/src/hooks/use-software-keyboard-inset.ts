import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";
import { useKeyboardInset } from "./use-keyboard-inset";

/**
 * How much space the software keyboard covers on **native**.
 *
 * An Expo app on Android is edge-to-edge, so the window no longer resizes when
 * the keyboard opens: the keyboard is painted over a full-height window and
 * anything at the bottom of the list stays behind it. Expo states it in its
 * keyboard guide — "On Android, Expo apps are edge-to-edge, so the window no
 * longer resizes for the keyboard. A view without a `behavior` stays under the
 * keyboard" — and the consequence is that the app has to reserve that space
 * itself instead of trusting `adjustResize`.
 *
 * `Keyboard`'s events are the only source for the number on native, exactly what
 * `ScrollScreenContainer` already listens to.
 *
 * Known limit: React Native documents that on **Android 10 and earlier** the
 * keyboard events do not fire at all when the activity uses `adjustResize` or
 * `adjustNothing`, which is what an Expo activity does. The inset then stays `0`
 * and the list reserves no keyboard space, so on those devices the last results
 * can only be reached after dismissing the keyboard. The field itself is pinned
 * above the list, so it is never the thing that ends up behind the IME. Fixing
 * the tail needs a `WindowInsets` source, which means a native module — see
 * `odd/tasks/gondola-search-native-keyboard.md`.
 */
export function resolveNativeKeyboardInset(keyboardHeight: number): number {
  // Nothing is added to the height the platform reports, deliberately. React
  // Native already reports the keyboard *above* the Android navigation bar
  // (`ReactRootView` computes `imeInsets.bottom - barInsets.bottom`), and the
  // containers reserve that bar themselves through the bottom safe-area edge. So
  // the covered space is `safe area + keyboard`, each counted once: adding the bar
  // here would reserve it twice and push the last row half a bar too far.
  return Math.max(0, Math.round(keyboardHeight));
}

/**
 * The part of `Keyboard` this module needs: two named events and a removable
 * subscription. A parameter instead of the module itself so a fake can drive the
 * events, which is the only way to test them without a device.
 */
export interface KeyboardEventSource {
  addListener(
    event: "keyboardDidShow" | "keyboardDidHide",
    listener: (payload: { endCoordinates: { height: number } }) => void,
  ): { remove(): void };
}

/**
 * Reports the keyboard height now and on every show and hide until the returned
 * function is called. A hide reports `0`, so the caller has one number to follow
 * instead of two flags.
 */
export function subscribeToNativeKeyboardHeight(
  keyboard: KeyboardEventSource,
  onChange: (height: number) => void,
): () => void {
  const showSubscription = keyboard.addListener("keyboardDidShow", (event) => {
    onChange(event.endCoordinates.height);
  });
  const hideSubscription = keyboard.addListener("keyboardDidHide", () => {
    onChange(0);
  });

  return () => {
    showSubscription.remove();
    hideSubscription.remove();
  };
}

/** The raw keyboard height native reports, `0` while it is closed. */
export function useNativeKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // react-native-web's `Keyboard` is a no-op, and the browser case is measured
    // from the visual viewport instead: see `useKeyboardInset`.
    if (Platform.OS === "web" || !Keyboard?.addListener) return;

    return subscribeToNativeKeyboardHeight(Keyboard, setHeight);
  }, []);

  return height;
}

/** The native keyboard inset, in points: exactly what the platform reported. */
export function useNativeKeyboardInset(): number {
  return resolveNativeKeyboardInset(useNativeKeyboardHeight());
}

export interface SoftwareKeyboardInsetInput {
  platform: string;
  /** Space the browser's keyboard takes from the visual viewport. */
  webInset: number;
  /** Space the keyboard takes on native, navigation bar included. */
  nativeInset: number;
}

/**
 * One number for the space the software keyboard covers, whichever platform
 * measured it.
 *
 * The sources are not interchangeable and never add up: on the web the browser
 * shrinks only the visual viewport, on native the keyboard is painted over the
 * window. Taking one per platform keeps a stale value from the other one out.
 */
export function resolveSoftwareKeyboardInset({
  platform,
  webInset,
  nativeInset,
}: SoftwareKeyboardInsetInput): number {
  return platform === "web" ? webInset : nativeInset;
}

/**
 * Space the software keyboard covers at the bottom of the window, on the web and
 * on native. This is what a list has to reserve so its last row, or a focused
 * field, is not left behind the keyboard.
 */
export function useSoftwareKeyboardInset(): number {
  const webInset = useKeyboardInset();
  const nativeInset = useNativeKeyboardInset();

  return resolveSoftwareKeyboardInset({
    platform: Platform.OS,
    webInset,
    nativeInset,
  });
}
