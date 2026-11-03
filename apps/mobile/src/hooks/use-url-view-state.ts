import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  router,
  useLocalSearchParams,
  useRootNavigationState,
} from "expo-router";

export type UrlParams = Record<string, string | string[] | undefined>;

/**
 * How one screen's view is encoded in the address.
 *
 * `parse` must keep `current` when the address says nothing about the view, and
 * treat an absent parameter as the neutral value once it does — that difference is
 * what stops "back" from restoring a filter the user already cleared, which is a
 * removal, not an update.
 */
export interface UrlViewCodec<T> {
  /** Parameters this view owns, used to tell a removal from an update. */
  readonly params: readonly string[];
  parse(params: UrlParams, current: T): T;
  build(state: T): Record<string, string | undefined>;
  /** Canonical key of one view, for comparison. */
  key(state: T): string;
}

export interface UseUrlViewStateOptions<T> {
  /**
   * Route the address belongs to, used when a change deserves its own entry. A
   * plain string because this hook serves several screens: expo-router's typed
   * routes narrow the allowed pathnames per call site.
   */
  route: string;
  codec: UrlViewCodec<T>;
  state: T;
  /**
   * Applies the address to the screen. Called only when the address moved on its own.
   *
   * Returning `false` means "not applied yet": the screen could not resolve the
   * address because the data it needs is still loading, so the same address is
   * offered again on the next render instead of being marked as handled and lost.
   */
  onApply: (next: T) => boolean | void;
  /** Whether this change deserves its own history entry. Default: never push. */
  shouldPush?: (previous: T, next: T) => boolean;
  /**
   * Parameters written with this view that the screen never applies, because
   * something else owns them (the gondola's `producerId` is resolved by the store
   * at bootstrap).
   */
  writeOnly?: Record<string, string | undefined>;
}

/**
 * Keeps a screen and its URL in sync, in both directions.
 *
 * - URL to screen: opening the address reproduces the view, and going back in the
 *   browser lands on the previous address, which reverts the view because it is
 *   real history rather than component state.
 * - Screen to URL: the address always shows what the user is seeing, so sharing it
 *   shares the page.
 *
 * The rule that keeps it honest: each side reacts only when the **other** side
 * moved. The URL is applied when the URL changes, and the URL is written when the
 * screen changes — never the other way round, and an applied URL is never echoed
 * back as a write. Comparing both directions against the same "current view" makes
 * the screen reset on every keystroke, because the apply effect reads the user's
 * freshly typed text as a divergence and reverts it.
 *
 * Three facts about expo-router this encodes, each learned the hard way:
 * writing the address before the first frame throws "Attempted to navigate before
 * mounting the Root Layout component"; `setParams` and `replace` ignore `undefined`
 * instead of removing a key, so a removal needs `history.replaceState`; and
 * `replaceState` notifies nobody, so the router keeps reporting the removed key and
 * that stale report has to be consumed once instead of applied.
 */
export function useUrlViewState<T>({
  route,
  codec,
  state,
  onApply,
  shouldPush,
  writeOnly,
}: UseUrlViewStateOptions<T>): void {
  // Typed routes constrain the generic to a route path, so values arrive raw and
  // are normalised by the codec.
  const params = useLocalSearchParams() as UrlParams;

  const onApplyRef = useRef(onApply);
  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  const shouldPushRef = useRef(shouldPush);
  useEffect(() => {
    shouldPushRef.current = shouldPush;
  }, [shouldPush]);

  // Parsed against what the screen is now: an address that says nothing about the
  // view keeps it, and one that speaks is authoritative for the whole view.
  const parsed = codec.parse(params, state);

  const screenKey = codec.key(state);
  const urlKey = codec.key(parsed);
  const writtenParams = useMemo(
    () => ({ ...codec.build(state), ...writeOnly }),
    [codec, state, writeOnly],
  );
  const writeKey = `${screenKey}|${JSON.stringify(writtenParams)}`;

  // Writing the address is navigation, and expo-router refuses it before the root
  // layout has mounted. The navigation state's key alone is not enough: a child's
  // effect runs before the layout's, so the first frame is awaited as well.
  const rootNavigationState = useRootNavigationState();
  const [firstFramePassed, setFirstFramePassed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFirstFramePassed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const navigationReady = Boolean(rootNavigationState?.key) && firstFramePassed;

  const lastAppliedUrlKeyRef = useRef<string | null>(null);
  const lastWrittenKeyRef = useRef<string | null>(null);
  // Set when the address moved without the router seeing it, so its stale report is
  // ignored once instead of reverting the user's last action.
  const skipApplyOnceRef = useRef(false);
  // Set while the address names something the screen could not resolve yet. The
  // write side stays quiet meanwhile: canonicalising the view would remove the very
  // parameter that is still loading, and the link would lose what it asked for.
  const pendingApplyRef = useRef(false);
  // Whether this view currently owns a pushed history entry that back will pop.
  const pushedEntryRef = useRef(false);
  // What both sides agreed on last, so `shouldPush` can tell a change that starts
  // something from one that merely continues it.
  const previousStateRef = useRef(state);

  const historyAvailable =
    Platform.OS === "web" && typeof window !== "undefined";

  // URL to screen: only when the URL itself changed (mount, back, forward, a link).
  useEffect(() => {
    if (skipApplyOnceRef.current) {
      skipApplyOnceRef.current = false;
      lastAppliedUrlKeyRef.current = urlKey;
      return;
    }

    if (lastAppliedUrlKeyRef.current === urlKey) return;

    lastAppliedUrlKeyRef.current = urlKey;

    if (urlKey === screenKey) return;

    const applied = onApplyRef.current(parsed) !== false;

    if (!applied) {
      // Leave the address marked as unhandled so the next render offers it again,
      // which is what an id resolved against still-loading data needs.
      lastAppliedUrlKeyRef.current = null;
      pendingApplyRef.current = true;
      return;
    }

    pendingApplyRef.current = false;

    previousStateRef.current = parsed;
    pushedEntryRef.current = false;
  }, [urlKey, parsed, screenKey]);

  // Screen to URL: only when the screen itself changed.
  useEffect(() => {
    if (!navigationReady) return;
    if (pendingApplyRef.current) return;

    if (lastWrittenKeyRef.current === writeKey) return;

    // Reaching the screen is not a change the user made: the first write only
    // canonicalises the address, it never adds a history step.
    const isFirstWrite = lastWrittenKeyRef.current === null;
    lastWrittenKeyRef.current = writeKey;

    const previous = previousStateRef.current;
    previousStateRef.current = state;

    const startsSomething = shouldPushRef.current?.(previous, state) ?? false;

    // One history step per thing that starts, not one per keystroke: the entry is
    // pushed with the address the user is leaving behind, and every later change
    // replaces the top entry, so back returns to the previous view.
    if (startsSomething && !isFirstWrite) {
      if (historyAvailable && !pushedEntryRef.current) {
        window.history.pushState(
          window.history.state,
          "",
          window.location.href,
        );
        pushedEntryRef.current = true;
      }

      // The router reports what it just wrote, so this key must not come back as a
      // foreign change.
      lastAppliedUrlKeyRef.current = screenKey;
      router.setParams(writtenParams);
      return;
    }

    // `setParams` merges: it can add and update a parameter but never remove one.
    // On the web a plain `replaceState` with the exact set of present parameters is
    // what removes them.
    const nextKeys = new Set(
      Object.entries(writtenParams)
        .filter(([, value]) => value !== undefined)
        .map(([key]) => key),
    );
    const managed = new Set<string>([
      ...codec.params,
      ...Object.keys(writeOnly ?? {}),
    ]);
    const mustDrop = Object.keys(params).some(
      (key) => managed.has(key) && !nextKeys.has(key),
    );

    if (mustDrop) {
      if (historyAvailable) {
        const target = new URL(window.location.href);

        for (const key of managed) {
          target.searchParams.delete(key);
        }

        for (const [key, value] of Object.entries(writtenParams)) {
          if (value !== undefined) target.searchParams.set(key, value);
        }

        if (target.href !== window.location.href) {
          window.history.replaceState(window.history.state, "", target.href);
          // The address changed without the router observing it, so the router
          // still reports the removed parameter. That stale read is consumed here,
          // once, instead of being applied over what the user just did.
          skipApplyOnceRef.current = true;
        }

        return;
      }

      // Native has no address bar to clean; the route params are all it has.
      router.replace({
        pathname: route,
        params: writtenParams,
      } as Parameters<typeof router.replace>[0]);
      return;
    }

    lastAppliedUrlKeyRef.current = screenKey;
    router.setParams(writtenParams);
  }, [
    navigationReady,
    writeKey,
    writtenParams,
    state,
    params,
    screenKey,
    historyAvailable,
    codec,
    route,
    writeOnly,
  ]);
}
