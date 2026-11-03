import type { UrlViewCodec } from "@/hooks/use-url-view-state";

/**
 * The reading the meditation screen is showing, as the address encodes it.
 *
 * The identity is the reading's id, never the offset: the screen picks from the
 * readings that are still unread first, so the same offset points at a different
 * text as soon as one gets read. An id is the only thing worth sharing.
 */
export interface MeditationViewState {
  readingId?: string;
}

export const MEDITATION_PARAMS = { reading: "lectura" } as const;

type RawParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * An address with no `lectura` keeps the screen as it is — a plain `/meditation`
 * must not jump to another reading — while an address that names one is
 * authoritative, and an empty value means "no preference".
 */
export function parseMeditationParams(
  params: RawParams,
  current: MeditationViewState,
): MeditationViewState {
  const raw = single(params[MEDITATION_PARAMS.reading]);

  if (raw === undefined) return current;

  return { readingId: raw.length > 0 ? raw : undefined };
}

export function buildMeditationParams(
  state: MeditationViewState,
): Record<string, string | undefined> {
  return { [MEDITATION_PARAMS.reading]: state.readingId || undefined };
}

export function meditationViewKey(state: MeditationViewState): string {
  return state.readingId ?? "";
}

export const meditationCodec: UrlViewCodec<MeditationViewState> = {
  params: [MEDITATION_PARAMS.reading],
  parse: parseMeditationParams,
  build: buildMeditationParams,
  key: meditationViewKey,
};
