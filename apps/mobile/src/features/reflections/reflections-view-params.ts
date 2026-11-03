import type { UrlViewCodec } from "@/hooks/use-url-view-state";

/**
 * The reflections view as the address encodes it: which section is open and, when
 * it is a program, which one is being previewed. Sharing `?seccion=cohorts&
 * cohorte=<id>` is "mirá este programa".
 */
export type ReflectionsSection = "daily" | "cohorts";

export interface ReflectionsViewState {
  section: ReflectionsSection;
  /** Cohort whose preview sheet is open; `undefined` when no sheet is open. */
  cohortId?: string;
}

export const REFLECTIONS_PARAMS = {
  section: "seccion",
  cohort: "cohorte",
} as const;

type RawParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Two cases, and the difference is load-bearing: an address with neither parameter
 * keeps the screen as it is (opening a bare `/reflections` must not change
 * anything), while an address that says something is authoritative for the whole
 * view, so an absent `cohorte` means "no sheet open" instead of "whatever was open
 * before".
 */
export function parseReflectionsParams(
  params: RawParams,
  current: ReflectionsViewState,
): ReflectionsViewState {
  const rawSection = single(params[REFLECTIONS_PARAMS.section]);
  const rawCohort = single(params[REFLECTIONS_PARAMS.cohort]);

  if (rawSection === undefined && rawCohort === undefined) return current;

  const section: ReflectionsSection =
    rawSection === "cohorts" ? "cohorts" : "daily";

  return {
    section,
    cohortId: rawCohort && rawCohort.length > 0 ? rawCohort : undefined,
  };
}

/**
 * The section is always written, even when it is the default one: the address has
 * to be able to say "the daily section, no sheet open", which is exactly what makes
 * closing a preview through the back button unambiguous.
 */
export function buildReflectionsParams(
  state: ReflectionsViewState,
): Record<string, string | undefined> {
  return {
    [REFLECTIONS_PARAMS.section]: state.section,
    [REFLECTIONS_PARAMS.cohort]: state.cohortId || undefined,
  };
}

export function reflectionsViewKey(state: ReflectionsViewState): string {
  return `${state.section}|${state.cohortId ?? ""}`;
}

export const reflectionsCodec: UrlViewCodec<ReflectionsViewState> = {
  params: [REFLECTIONS_PARAMS.section, REFLECTIONS_PARAMS.cohort],
  parse: parseReflectionsParams,
  build: buildReflectionsParams,
  key: reflectionsViewKey,
};
