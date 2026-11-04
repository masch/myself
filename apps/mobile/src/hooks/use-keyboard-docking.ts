import { useCallback, useEffect, useRef } from "react";
import {
  Platform,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { resolveDockedInputScroll } from "@/components/focus-scroll";
import { spacing } from "@/theme";
import { useKeyboardInset } from "./use-keyboard-inset";

/**
 * Gap the docked input keeps between itself and the top of the list.
 */
export const DOCK_TOP_SPACING = spacing.md;

/**
 * How long the browser gets to finish its own scroll work before the input is
 * docked. The visual-viewport resize arrives while the browser is still scrolling
 * the caret into view, and measuring before that settles docks against a stale
 * offset.
 */
const DOCK_DELAY_MS = 50;

/** The part of a measured view the docking needs: `measureLayout` and nothing else. */
export interface MeasurableInput {
  measureLayout?: (
    relativeTo: unknown,
    onSuccess: (
      left: number,
      top: number,
      width: number,
      height: number,
    ) => void,
    onFail?: () => void,
  ) => void;
}

/**
 * The part of a virtualised list the docking needs. `FlatList` satisfies it; so
 * does any other list that can report its scroll node and scroll to an offset.
 */
export interface ScrollableList {
  getScrollableNode?: () => unknown;
  scrollToOffset: (params: { offset: number; animated?: boolean }) => void;
}

export interface ScrollableListRef {
  readonly current: ScrollableList | null;
}

export interface KeyboardDocking {
  /** Space the software keyboard covers at the bottom of the window. */
  keyboardInset: number;
  /** Callback an input calls when it gains focus: the list answers by docking it. */
  scrollToFocusedInput: (input: unknown) => void;
  /** Feed to the list's `onScroll` so the dock knows where the list already is. */
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/**
 * Keeps the input somebody is typing in on screen, above the software keyboard,
 * for screens that scroll their own virtualised list instead of using
 * `ScreenContainer.Scroll`.
 *
 * Two facts drive it. On the web the browser shrinks only the *visual* viewport,
 * so a full-height list keeps painting the field behind the keyboard; reserving
 * the difference as bottom padding makes the field reachable, and only a scroll
 * makes it visible. And a list of results is only usable when the field sits at
 * the **top** of the band the keyboard leaves, not at its bottom edge, so the
 * text being typed and the results under it share the screen.
 *
 * Outside the web `useKeyboardInset` reports `0` and nothing is docked: Android
 * resizes the window with the keyboard and the list already shrinks with it.
 */
export function useKeyboardDocking(
  listRef: ScrollableListRef,
): KeyboardDocking {
  const keyboardInset = useKeyboardInset();
  const focusedInputRef = useRef<MeasurableInput | null>(null);
  const scrollYRef = useRef(0);

  const dock = useCallback(
    (input: MeasurableInput | null, inset: number) => {
      const list = listRef.current;
      const scrollNode = list?.getScrollableNode?.();

      if (inset <= 0 || !list || !scrollNode) return;
      if (typeof input?.measureLayout !== "function") return;

      try {
        input.measureLayout(
          scrollNode,
          (_left: number, top: number) => {
            // The coordinate system the measurement arrives in differs per
            // platform: see focus-scroll.ts.
            const offset = resolveDockedInputScroll({
              top,
              scrollY: scrollYRef.current,
              viewportRelative: Platform.OS === "web",
              topSpacing: DOCK_TOP_SPACING,
            });

            if (offset !== null) {
              list.scrollToOffset({ offset, animated: true });
            }
          },
          () => undefined,
        );
      } catch {
        // The input can unmount between the focus and the measurement. Nothing to
        // dock then, and throwing here would break the focus that just happened.
      }
    },
    [listRef],
  );

  const scrollToFocusedInput = useCallback(
    (input: unknown) => {
      const measurable = input as MeasurableInput | null;
      focusedInputRef.current = measurable;
      dock(measurable, keyboardInset);
    },
    [dock, keyboardInset],
  );

  useEffect(() => {
    if (keyboardInset <= 0) return;

    const timer = setTimeout(() => {
      // `TextInput.State` is empty on react-native-web, where the input reports
      // itself through the focus callback above instead.
      const focused =
        TextInput.State?.currentlyFocusedInput?.() ?? focusedInputRef.current;

      dock(focused as MeasurableInput | null, keyboardInset);
    }, DOCK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [keyboardInset, dock]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  return { keyboardInset, scrollToFocusedInput, handleScroll };
}
