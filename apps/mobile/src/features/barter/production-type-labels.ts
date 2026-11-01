import type { ProductionType } from "@myself/shared";

/**
 * The word a producer reads, next to the value the app stores.
 *
 * The enum is the contract (`ORGANIC`, `AGROECOLOGICAL`, …) and it is what a
 * stored package carries; it was never meant to be the label. Before this map,
 * four badges rendered the raw enum while the gondola filter said
 * "Agroecológico", so one label had two sources of truth and the screen showed
 * the database's spelling to the person using it.
 *
 * It is a `Record<ProductionType, string>`, so growing `PRODUCTION_TYPES`
 * without translating the new value is a type error instead of an english word
 * appearing in the UI.
 */
export const PRODUCTION_TYPE_LABELS: Record<ProductionType, string> = {
  AGROECOLOGICAL: "Agroecológico",
  ORGANIC: "Orgánico",
  BIODYNAMIC: "Biodinámico",
  VEGAN: "Vegano",
  CONVENTIONAL: "Convencional",
};

/** The label for one production type. */
export function productionTypeLabel(type: ProductionType): string {
  return PRODUCTION_TYPE_LABELS[type];
}
