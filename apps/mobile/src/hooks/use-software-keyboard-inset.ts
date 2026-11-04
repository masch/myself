import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
 */
export interface NativeKeyboardInsetInput {
  /** Height the platform reported for the keyboard itself. */
  keyboardHeight: number;
  /** Space the system navigation takes at the bottom of the window. */
  bottomInset: number;
  /** Whether the navigation bar is drawn under the window, as Android does. */
  isAndroid: boolean;
}

export function resolveNativeKeyboardInset({
  keyboardHeight,
  bottomInset,
  isAndroid,
}: NativeKeyboardInsetInput): number {
  if (keyboardHeight <= 0) return 0;

  // React Native reports the keyboard height above the Android navigation bar,
  // and an edge-to-edge window extends under that bar: the space the app loses is
  // the keyboard plus the bar. iOS paints over the window without it.
  return Math.round(keyboardHeight + (isAndroid ? bottomInset : 0));
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

/** The native keyboard inset, in points, including the Android navigation bar. */
export function useNativeKeyboardInset(): number {
  const keyboardHeight = useNativeKeyboardHeight();
  const { bottom } = useSafeAreaInsets();

  return resolveNativeKeyboardInset({
    keyboardHeight,
    bottomInset: bottom,
    isAndroid: Platform.OS === "android",
  });
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
