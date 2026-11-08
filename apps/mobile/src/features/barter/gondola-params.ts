import { PRODUCTION_TYPES, type ProductionType } from "@myself/shared";
import type { UrlViewCodec } from "@/hooks/use-url-view-state";
import {
  DEFAULT_CARD_VARIANT,
  isCardVariant,
  type CardVariant,
} from "./card-variant";

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
  /**
   * Which of the two validation card layouts the gondola draws. It travels with
   * the filters because it is the same question — how do I want to see the
   * gondola? — and because a tester can then be handed `?card=ficha`.
   */
  cardVariant: CardVariant;
}

export const GONDOLA_PARAMS = {
  query: "q",
  productionType: "tipo",
  maxDistanceKm: "km",
  cardVariant: "card",
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
  GONDOLA_PARAMS.cardVariant,
] as const;

/**
 * Reads the gondola view out of the URL.
 *
 * Two cases, and the difference is load-bearing:
 *
 * - The address says nothing about the gondola (no `q`, `tipo`, `km` or `card`):
 *   the screen keeps `defaults`, which is whatever the persisted gondola already
 *   had. Opening a plain `/barter` must not reset somebody's filter.
 * - The address says something: it is authoritative for the whole view, so an
 *   absent `tipo` or `km` means "Todos" and "any distance", **not** the value the
 *   screen happened to hold at mount. Reading absence as the mount-time value made
 *   back and forward restore a filter the user had already cleared, because
 *   clearing it removes the parameter.
 *
 * A distance is accepted for any positive number, not only the chips the screen
 * offers, so a link built by a newer build keeps working. A layout the URL does
 * not name — missing, empty or invented — is the default one, which is what makes
 * a bare `?card=ficha` a complete address for the shared layout.
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

  const rawCardVariant = single(params[GONDOLA_PARAMS.cardVariant]);
  const cardVariant = isCardVariant(rawCardVariant)
    ? rawCardVariant
    : DEFAULT_CARD_VARIANT;

  return {
    query: single(params[GONDOLA_PARAMS.query]) ?? "",
    productionType,
    maxDistanceKm,
    cardVariant,
  };
}

/**
 * Writes the gondola view into URL parameters.
 *
 * Every key is always present so a cleared filter removes its parameter instead
 * of leaving the previous value behind, and an unfiltered gondola serialises to
 * an empty object — no `?q=&tipo=ALL` noise in a shared link. The layout follows
 * the same rule: the default closes with no parameter at all, and only a user who
 * picked the other card shares a `?card=`.
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
    [GONDOLA_PARAMS.cardVariant]:
      state.cardVariant === DEFAULT_CARD_VARIANT
        ? undefined
        : state.cardVariant,
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

/**
 * The gondola view as the address encodes it, in the shape `useUrlViewState`
 * expects. `producerId` is deliberately absent: the store resolves it at bootstrap
 * and the hook only writes it back, so it belongs to the write-only parameters.
 */
export const gondolaCodec: UrlViewCodec<GondolaViewState> = {
  params: [
    GONDOLA_PARAMS.query,
    GONDOLA_PARAMS.productionType,
    GONDOLA_PARAMS.maxDistanceKm,
    GONDOLA_PARAMS.cardVariant,
  ],
  parse: parseGondolaParams,
  build: (state) => buildGondolaParams(state),
  key: (state) => gondolaViewKey(state),
};
