import { formatCatalogSize, type CatalogPackageInfo } from "./catalog-packages";

/**
 * The single owner of every string a package card derives.
 *
 * Two card layouts exist only to validate which hierarchy reads better, so their
 * numbers have to be one implementation: a second copy of this arithmetic is how
 * the same package ends up telling two stories depending on which layout the
 * validation user picked.
 *
 * Everything here answers one question — **what does this package really hand
 * over for the PAP it trades?** — in the money a producer thinks in.
 */

/**
 * An ARS amount as the card writes it: whole pesos, Spanish thousands, unsigned.
 *
 * The sign is deliberately not formatted here: `abajo` and `arriba` already say
 * the direction in words, and a colour alone would not — so a caller that needs a
 * sign spells it, and a negative input still reads as a magnitude.
 */
export function formatArs(amountArs: number): string {
  const whole = Math.abs(Math.round(amountArs));

  return `$${whole.toLocaleString("es-AR")}`;
}

/**
 * The price the PDF prints, with the cents it prints: `$22.158,20`.
 *
 * Kept apart from `formatArs` because a printed price is a quotation (cents
 * matter, it is what the producer loaded) while a difference is a verdict
 * (pesos are enough, and `$1.741,37` buries the number in noise).
 */
export function formatPrintedPrice(amountArs: number): string {
  return `$${amountArs.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * The containers a counted package holds: `9 envases de 500 ml`.
 *
 * Silence is the answer in the two cases where the words would be noise: a single
 * presentation (there is nothing to count) and a product counted in units, whose
 * quantity already reads `7 unidades` — `7 envases de 1 unidad` is not Spanish.
 * The same two drops decide the parenthetical the card, the sheet and the proposal
 * modal render, because two spellings of one printed number would be a bug.
 */
export function packagingLabel(catalog: CatalogPackageInfo): string | null {
  if (catalog.kind !== "empaquetado") return null;
  if (catalog.presentationCount <= 1) return null;
  if (catalog.measure === "unidad") return null;

  return `${catalog.presentationCount} envases de ${formatCatalogSize(
    catalog.presentationSize,
    catalog.measure,
  )}`;
}

/**
 * How far the producer is, as the origin block writes it: `a 12 km`.
 *
 * Distance and address used to share one grey line under the printed price
 * (`📍 985 km · Guadalupe Norte, Santa Fe`). The user asked for the producer and
 * its origin highlighted on every card, so the two facts split: the distance is
 * the number the eye compares across cards and stands alone, without a pin in
 * front of it, and the address keeps its own line beside it.
 */
export function distanceLabel(distanceKm: number): string {
  return `a ${distanceKm} km`;
}
