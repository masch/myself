import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  router,
  useLocalSearchParams,
  useRootNavigationState,
} from "expo-router";
import {
  GONDOLA_PARAMS,
  buildGondolaParams,
  gondolaViewKey,
  parseGondolaParams,
  type GondolaViewState,
} from "./gondola-params";

export interface UseGondolaParamsInput extends GondolaViewState {
  activeProducerId?: string;
  /** Applies the URL to the screen. Called only when the URL moved on its own. */
  onApply: (state: GondolaViewState) => void;
}

const GONDOLA_ROUTE = "/barter";

/**
 * Keeps the gondola screen and its URL in sync, in both directions.
 *
 * - URL to screen: opening `/barter?q=queso&tipo=ORGANICO&km=250` reproduces the
 *   gondola, and going back in the browser lands on the previous URL, which
 *   reverts the search because it is real history rather than component state.
 * - Screen to URL: the address always shows what the user is seeing, so sharing
 *   it shares the page.
 *
 * The rule that keeps it honest: each side reacts only when the **other** side
 * moved. The URL is applied when the URL changes, and the URL is written when the
 * screen changes — never the other way round, and an applied URL is never echoed
 * back as a write. Comparing both directions against the same "current view" made
 * the screen reset on every keystroke, because the apply effect read the user's
 * freshly typed text as a divergence and reverted it.
 *
 * The screen is never re-navigated: pushing the same route mounted a second
 * gondola and the two instances fought over the URL, each writing its own view.
 * A search that starts instead pushes one plain history entry (`pushState` with
 * the current URL and state), and the router then writes the search onto it. Back
 * pops to the entry that still carries the pre-search address, which is what the
 * apply side reads.
 *
 * Accepted cost: when the search is cleared with the ✕ instead of the back
 * button, that pushed entry stays. Popping it from here was tried and reverted —
 * `history.back()` raced the router's own write and left the address with the
 * query it was supposed to remove, which broke clearing altogether. A stale step
 * that costs one back press is better than a ✕ that does not clear.
 *
 * The URL is applied with the *search* key (`q`, `tipo`, `km`), the only values
 * the screen can be pushed back to; the producer is read once by the store at
 * bootstrap and merely written back, so a shared link also names it.
 */
export function useGondolaParams({
  query,
  productionType,
  maxDistanceKm,
  activeProducerId,
  onApply,
}: UseGondolaParamsInput): void {
  // Typed routes constrain the generic to a route path, so the comma-separated
  // values a repeated parameter can produce are read as raw strings here and
  // normalised by `parseGondolaParams`.
  const params = useLocalSearchParams() as Record<
    string,
    string | string[] | undefined
  >;
  const onApplyRef = useRef(onApply);
  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);

  const view = useMemo<GondolaViewState>(
    () => ({ query, productionType, maxDistanceKm }),
    [query, productionType, maxDistanceKm],
  );

  // The screen's own values at mount, so an absent parameter keeps whatever the
  // persisted gondola already had instead of resetting it.
  const [initialDefaults] = useState(view);
  const parsed = useMemo(
    () => parseGondolaParams(params, initialDefaults),
    [params, initialDefaults],
  );

  // Derived from the screen, so it belongs to this render: the apply side only
  // uses it to skip an application the screen already matches.
  const screenKey = gondolaViewKey(view);

  const urlKey = gondolaViewKey(parsed);
  const writeKey = gondolaViewKey(view, activeProducerId);

  // Writing the address is navigation, and expo-router refuses it before the root
  // layout has mounted ("Attempted to navigate before mounting the Root Layout
  // component"). The navigation state's key alone is not enough: a child's effect
  // runs before the layout's, so the first frame is awaited as well.
  const rootNavigationState = useRootNavigationState();
  const [firstFramePassed, setFirstFramePassed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFirstFramePassed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const navigationReady = Boolean(rootNavigationState?.key) && firstFramePassed;

  const lastAppliedUrlKeyRef = useRef<string | null>(null);
  const lastWrittenKeyRef = useRef<string | null>(null);
  // Set when the URL moved on its own, so the write side does not echo it back.
  const skipNextWriteRef = useRef(false);
  // Whether this search owns a pushed history entry that has to be popped.
  const searchEntryPushedRef = useRef(false);
  // The last query both sides agreed on: tells a search that starts from one that
  // merely arrived in a shared link.
  const previousQueryRef = useRef(query);

  const historyAvailable =
    Platform.OS === "web" && typeof window !== "undefined";

  // URL to screen: only when the URL itself changed (mount, back, forward, a
  // pasted link).
  useEffect(() => {
    if (lastAppliedUrlKeyRef.current === urlKey) return;

    lastAppliedUrlKeyRef.current = urlKey;

    if (urlKey === screenKey) return;

    // A query that arrives in a link is not a search the user started, and this
    // change came from the browser, so it must not be written back.
    previousQueryRef.current = parsed.query;
    skipNextWriteRef.current = true;
    if (parsed.query.trim() === "") searchEntryPushedRef.current = false;

    onApplyRef.current(parsed);
  }, [urlKey, parsed, screenKey]);

  // Screen to URL: only when the screen itself changed.
  useEffect(() => {
    if (!navigationReady) return;

    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      lastWrittenKeyRef.current = writeKey;
      return;
    }

    if (lastWrittenKeyRef.current === writeKey) return;

    // Reaching the screen is not a search: the first write only canonicalises the
    // address (it fills in the producer), it never adds a history step.
    const isFirstWrite = lastWrittenKeyRef.current === null;
    lastWrittenKeyRef.current = writeKey;
    // The URL is about to say exactly this; do not treat it as a foreign change.
    lastAppliedUrlKeyRef.current = screenKey;

    const searchStarted =
      previousQueryRef.current.trim() === "" && query.trim() !== "";
    previousQueryRef.current = query;

    const nextParams = buildGondolaParams(view, activeProducerId);

    // One history step per search, not one per keystroke: the entry is pushed with
    // the address the user is leaving behind, and every later character replaces
    // the top entry, so back returns to the unfiltered gondola.
    if (searchStarted && !isFirstWrite) {
      if (historyAvailable && !searchEntryPushedRef.current) {
        window.history.pushState(
          window.history.state,
          "",
          window.location.href,
        );
        searchEntryPushedRef.current = true;
      }

      router.setParams(nextParams);
      return;
    }

    // Neither `setParams` nor `replace` can delete a parameter: both drop the
    // `undefined` values instead of removing the key, so resetting a filter back
    // to "Todos" left `tipo=ORGANIC` in the address and the URL-to-screen
    // direction faithfully restored it. On the web a plain `replaceState` with the
    // exact set of present parameters is what removes them.
    const nextKeys = new Set(
      Object.entries(nextParams)
        .filter(([, value]) => value !== undefined)
        .map(([key]) => key),
    );
    const mustDrop = Object.keys(params).some(
      (key) =>
        Object.values(GONDOLA_PARAMS).includes(
          key as (typeof GONDOLA_PARAMS)[keyof typeof GONDOLA_PARAMS],
        ) && !nextKeys.has(key),
    );

    if (mustDrop) {
      if (historyAvailable) {
        const target = new URL(window.location.href);

        for (const key of Object.values(GONDOLA_PARAMS)) {
          target.searchParams.delete(key);
        }

        for (const [key, value] of Object.entries(nextParams)) {
          if (value !== undefined) target.searchParams.set(key, value);
        }

        if (target.href !== window.location.href) {
          window.history.replaceState(window.history.state, "", target.href);
        }

        return;
      }

      // Native has no address bar to clean; the route params are all it has.
      router.replace({ pathname: GONDOLA_ROUTE, params: nextParams });
      return;
    }

    router.setParams(nextParams);
  }, [
    navigationReady,
    writeKey,
    view,
    query,
    activeProducerId,
    params,
    screenKey,
    historyAvailable,
  ]);
}
