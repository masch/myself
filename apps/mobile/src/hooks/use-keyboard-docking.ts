import { useCallback, useEffect, useRef } from "react";
import {
  Platform,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { resolveDockedInputScroll } from "@/components/focus-scroll";
import { spacing } from "@/theme";
import { useSoftwareKeyboardInset } from "./use-software-keyboard-inset";

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
export interface DockableInput {
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
export interface DockingList {
  getScrollableNode?: () => unknown;
  scrollToOffset: (params: { offset: number; animated?: boolean }) => void;
}

export interface ScrollableListRef {
  readonly current: DockingList | null;
}

export interface KeyboardDockingControllerOptions {
  /**
   * The list to dock in, read on every attempt instead of once: the ref is
   * `null` on the first render and only fills in after the list has mounted.
   */
  list: () => DockingList | null;
  /**
   * The input the platform considers focused right now, asked when a scheduled
   * dock runs. Defaults to `TextInput.State`, which react-native-web leaves empty.
   */
  readFocusedInput?: () => DockableInput | null;
  /**
   * Runs `run` after the dock delay and returns the cancellation of that run.
   * A parameter instead of a bare `setTimeout` so a fake can drive the delay in
   * tests, where waiting 50ms per case would be both slow and flaky.
   */
  schedule?: (run: () => void) => () => void;
  /** `true` when `measureLayout` reported visible-port coordinates, i.e. on the web. */
  viewportRelative: boolean;
  /** Gap to keep between the docked input and the top of the list. */
  topSpacing?: number;
}

export interface KeyboardDockingController {
  /** Remember `input` and dock it now, if the keyboard is already open. */
  reportFocus(input: unknown): void;
  /** The keyboard opened, moved, or closed: dock once, after the delay. */
  reportInset(inset: number): void;
  /** Where the list is scrolled to right now, the base a dock is added to. */
  reportScroll(offset: number): void;
  /** Cancel a dock that has not run yet. */
  dispose(): void;
}

/** The delay, as a scheduler: one timer per dock, cancelled with the returned function. */
function scheduleDock(run: () => void): () => void {
  const timer = setTimeout(run, DOCK_DELAY_MS);

  return () => clearTimeout(timer);
}

function readPlatformFocusedInput(): DockableInput | null {
  // `TextInput.State` is empty on react-native-web, where the input reports
  // itself through the focus callback instead.
  const focused = TextInput.State?.currentlyFocusedInput?.();

  return (focused as DockableInput | null | undefined) ?? null;
}

/**
 * Everything the docking decides, without React.
 *
 * The hook below is only an adapter over this: the rules that matter — when a
 * dock is allowed, which input it measures, how long it waits and what it does
 * with the result — are plain functions with no component tree, so they can be
 * driven by fakes instead of a rendered list. This repo has no React renderer.
 *
 * The controller also owns the state a render would otherwise lose: the last
 * reported inset, the input that reported itself, the list's scroll offset, and
 * the pending dock.
 */
export function createKeyboardDockingController(
  options: KeyboardDockingControllerOptions,
): KeyboardDockingController {
  const readList = options.list;
  const readFocusedInput = options.readFocusedInput ?? readPlatformFocusedInput;
  const schedule = options.schedule ?? scheduleDock;
  const viewportRelative = options.viewportRelative;
  const topSpacing = options.topSpacing ?? DOCK_TOP_SPACING;

  let keyboardInset = 0;
  let reportedInput: DockableInput | null = null;
  let scrollY = 0;
  let cancelScheduledDock: (() => void) | null = null;

  const cancelPendingDock = () => {
    cancelScheduledDock?.();
    cancelScheduledDock = null;
  };

  const dock = (input: DockableInput | null, inset: number) => {
    if (inset <= 0) return;

    // One list and one scroll node per attempt: the list can remount while the
    // measurement is in flight, and the scroll has to land on the one measured against.
    const list = readList();
    const scrollNode = list?.getScrollableNode?.();
    if (!list || !scrollNode) return;

    if (typeof input?.measureLayout !== "function") return;

    try {
      input.measureLayout(
        scrollNode,
        (_left: number, top: number) => {
          // The coordinate system the measurement arrives in differs per
          // platform: see focus-scroll.ts.
          const offset = resolveDockedInputScroll({
            top,
            scrollY,
            viewportRelative,
            topSpacing,
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
  };

  return {
    reportFocus: (input: unknown) => {
      const measurable = (input as DockableInput | null | undefined) ?? null;
      reportedInput = measurable;
      dock(measurable, keyboardInset);
    },

    reportInset: (inset: number) => {
      keyboardInset = inset;
      cancelPendingDock();

      if (inset <= 0) return;

      // One dock per inset: another resize while the first attempt is still
      // pending replaces it, so a single keyboard does not dock the list twice.
      // The inset is captured here because that is what this attempt was scheduled for.
      cancelScheduledDock = schedule(() => {
        cancelScheduledDock = null;
        dock(readFocusedInput() ?? reportedInput, inset);
      });
    },

    reportScroll: (offset: number) => {
      scrollY = offset;
    },

    dispose: () => {
      cancelPendingDock();
    },
  };
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
 * Three facts drive it. On the web the browser shrinks only the *visual* viewport,
 * so a full-height list keeps painting the field behind the keyboard. On native
 * an Expo Android app is edge-to-edge, so the window does not resize either and
 * the keyboard is painted over it. And a list of results is only usable when the
 * field sits at the **top** of the band the keyboard leaves, not at its bottom
 * edge, so the text being typed and the results under it share the screen.
 *
 * The inset comes from `useSoftwareKeyboardInset`, which measures the visual
 * viewport on the web and listens to the platform's keyboard events on native:
 * the two windows are different, and only their own source describes them.
 *
 * The rules themselves live in `createKeyboardDockingController`; this hook only
 * feeds it the inset, the focus reports and the scroll offset.
 */
export function useKeyboardDocking(
  listRef: ScrollableListRef,
): KeyboardDocking {
  const keyboardInset = useSoftwareKeyboardInset();
  const controllerRef = useRef<{
    listRef: ScrollableListRef;
    controller: KeyboardDockingController;
  } | null>(null);

  // Kept for the life of one list: the controller holds the focus, scroll and
  // pending-dock bookkeeping, which must not restart on every render. Created
  // inside a callback rather than during render so no ref is read while
  // rendering, and so the list ref can still be null the first time the hook runs.
  //
  // It is cached *per list ref*, not once: a caller can hand over a different ref
  // object on a later render, and a controller built against the previous one
  // would dock the list that is no longer on screen. The replaced controller is
  // disposed so its pending attempt cannot land on the old list.
  const getController = useCallback(() => {
    const cached = controllerRef.current;
    if (cached?.listRef === listRef) return cached.controller;

    cached?.controller.dispose();

    const controller = createKeyboardDockingController({
      // Read on every attempt: the ref fills in only after the list mounts.
      list: () => listRef.current,
      viewportRelative: Platform.OS === "web",
    });
    controllerRef.current = { listRef, controller };

    return controller;
  }, [listRef]);

  const scrollToFocusedInput = useCallback(
    (input: unknown) => getController().reportFocus(input),
    [getController],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      getController().reportScroll(event.nativeEvent.contentOffset.y);
    },
    [getController],
  );

  // Every distinct inset replaces the pending dock, and unmounting cancels it:
  // the delay must never outlive the list it would scroll.
  useEffect(() => {
    const controller = getController();
    controller.reportInset(keyboardInset);

    return () => controller.dispose();
  }, [getController, keyboardInset]);

  return { keyboardInset, scrollToFocusedInput, handleScroll };
}
