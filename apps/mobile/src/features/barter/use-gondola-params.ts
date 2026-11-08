import { useCallback, useMemo } from "react";
import { useUrlViewState } from "@/hooks/use-url-view-state";
import {
  GONDOLA_PARAMS,
  gondolaCodec,
  type GondolaViewState,
} from "./gondola-params";

export interface UseGondolaParamsInput extends GondolaViewState {
  activeProducerId?: string;
  /** Applies the URL to the screen. Called only when the URL moved on its own. */
  onApply: (state: GondolaViewState) => void;
}

const GONDOLA_ROUTE = "/barter";

/**
 * The gondola's binding to the address, expressed through the shared mechanism.
 *
 * What is gondola-specific lives here: which extra parameter belongs to the same
 * address without being applied (`producerId`, resolved by the store at bootstrap)
 * and what counts as "a search starts", the only change that deserves its own
 * history entry.
 */
export function useGondolaParams({
  query,
  productionType,
  maxDistanceKm,
  cardVariant,
  activeProducerId,
  onApply,
}: UseGondolaParamsInput): void {
  const view = useMemo<GondolaViewState>(
    () => ({ query, productionType, maxDistanceKm, cardVariant }),
    [query, productionType, maxDistanceKm, cardVariant],
  );

  const writeOnly = useMemo(
    () => ({ [GONDOLA_PARAMS.producerId]: activeProducerId || undefined }),
    [activeProducerId],
  );

  // One entry per search, not one per keystroke: the first character is worth
  // going back to, the rest replace it so the history stays short.
  const shouldPush = useCallback(
    (previous: GondolaViewState, next: GondolaViewState) =>
      previous.query.trim() === "" && next.query.trim() !== "",
    [],
  );

  useUrlViewState({
    route: GONDOLA_ROUTE,
    codec: gondolaCodec,
    state: view,
    onApply,
    shouldPush,
    writeOnly,
  });
}
