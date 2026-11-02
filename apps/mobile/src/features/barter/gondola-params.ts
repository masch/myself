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

const GONDOLA_VIEW_PARAMS = [
  GONDOLA_PARAMS.query,
  GONDOLA_PARAMS.productionType,
  GONDOLA_PARAMS.maxDistanceKm,
] as const;

/**
 * Reads the gondola view out of the URL.
 *
 * Two cases, and the difference is load-bearing:
 *
 * - The address says nothing about the gondola (no `q`, `tipo` or `km`): the
 *   screen keeps `defaults`, which is whatever the persisted gondola already had.
 *   Opening a plain `/barter` must not reset somebody's filter.
 * - The address says something: it is authoritative for the whole view, so an
 *   absent `tipo` or `km` means "Todos" and "any distance", **not** the value the
 *   screen happened to hold at mount. Reading absence as the mount-time value made
 *   back and forward restore a filter the user had already cleared, because
 *   clearing it removes the parameter.
 *
 * A distance is accepted for any positive number, not only the chips the screen
 * offers, so a link built by a newer build keeps working.
 */
export function parseGondolaParams(
  params: RawParams,
  defaults: GondolaViewState,
): GondolaViewState {
  const speaksAboutGondola = GONDOLA_VIEW_PARAMS.some(
    (key) => single(params[key]) !== undefined,
  );

  if (!speaksAboutGondola) return defaults;

  const rawType = single(params[GONDOLA_PARAMS.productionType]);
  const productionType = PRODUCTION_TYPES.includes(rawType as ProductionType)
    ? (rawType as ProductionType)
    : "ALL";

  const rawDistance = Number(single(params[GONDOLA_PARAMS.maxDistanceKm]));
  const maxDistanceKm =
    Number.isFinite(rawDistance) && rawDistance > 0 ? rawDistance : undefined;

  return {
    query: single(params[GONDOLA_PARAMS.query]) ?? "",
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
