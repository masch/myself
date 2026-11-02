import { PRODUCTION_TYPES, type ProductionType } from "@myself/shared";

/**
 * The gondola view encoded in the URL, so the address a producer is looking at
 * is the page itself: paste it in another phone, or reload it, and the same
 * gondola appears. It is also what makes the browser back button useful — each
 * search that starts is real history, not a component flag the router cannot see.
 */
export type GondolaTypeFilter = ProductionType | "ALL";

export interface GondolaViewState {
  /** Search text exactly as typed; empty when the gondola is unfiltered. */
  query: string;
  /** Certification filter; `"ALL"` means no filter and is never written to the URL. */
  productionType: GondolaTypeFilter;
  /** Distance ceiling in km; `undefined` means any distance. */
  maxDistanceKm?: number;
}

export const GONDOLA_PARAMS = {
  query: "q",
  productionType: "tipo",
  maxDistanceKm: "km",
  producerId: "producerId",
} as const;

/** What `router.setParams` receives: `undefined` removes the parameter. */
export type GondolaParamValues = Partial<
  Record<(typeof GONDOLA_PARAMS)[keyof typeof GONDOLA_PARAMS], string>
>;

type RawParams = Record<string, string | string[] | undefined>;

/** Repeated parameters arrive as an array; the first value is the one the user meant. */
function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Reads the gondola view out of the URL.
 *
 * Anything missing or unrecognised falls back to `defaults` instead of throwing:
 * a hand-edited or stale link must still open a usable gondola. A distance is
 * accepted for any positive number, not only the chips the screen offers, so a
 * link built by a newer build keeps working.
 */
export function parseGondolaParams(
  params: RawParams,
  defaults: GondolaViewState,
): GondolaViewState {
  const rawType = single(params[GONDOLA_PARAMS.productionType]);
  const productionType =
    rawType === "ALL"
      ? "ALL"
      : PRODUCTION_TYPES.includes(rawType as ProductionType)
        ? (rawType as ProductionType)
        : defaults.productionType;

  const rawDistance = Number(single(params[GONDOLA_PARAMS.maxDistanceKm]));
  const maxDistanceKm =
    Number.isFinite(rawDistance) && rawDistance > 0
      ? rawDistance
      : defaults.maxDistanceKm;

  return {
    query: single(params[GONDOLA_PARAMS.query]) ?? defaults.query,
    productionType,
    maxDistanceKm,
  };
}

/**
 * Writes the gondola view into URL parameters.
 *
 * Every key is always present so a cleared filter removes its parameter instead
 * of leaving the previous value behind, and an unfiltered gondola serialises to
 * an empty object — no `?q=&tipo=ALL` noise in a shared link.
 */
export function buildGondolaParams(
  state: GondolaViewState,
  producerId?: string,
): GondolaParamValues {
  const query = state.query.trim();

  return {
    [GONDOLA_PARAMS.query]: query.length > 0 ? query : undefined,
    [GONDOLA_PARAMS.productionType]:
      state.productionType !== "ALL" ? state.productionType : undefined,
    [GONDOLA_PARAMS.maxDistanceKm]:
      state.maxDistanceKm && state.maxDistanceKm > 0
        ? String(state.maxDistanceKm)
        : undefined,
    [GONDOLA_PARAMS.producerId]: producerId || undefined,
  };
}

/**
 * Canonical string for one gondola view, used to compare the URL against the
 * screen state without caring about parameter order or present-but-empty values.
 */
export function gondolaViewKey(
  state: GondolaViewState,
  producerId?: string,
): string {
  const params = buildGondolaParams(state, producerId);

  return Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}
