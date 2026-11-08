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
 * over for the PAP it trades?** — and it answers it in the money a producer
 * thinks in, never in a bare PAP fraction: `real 0,97 PAP` means nothing to
 * somebody deciding whether to trade, `Queda $1.741 abajo de 1 PAP` means
 * exactly what it costs.
 */

/** Which way a package lands against the whole PAP it trades. */
export type PapAdjustmentDirection = "below" | "above" | "exact";

/** The rounding a package discloses, in the three shapes a card renders it. */
export interface PapAdjustmentCopy {
  direction: PapAdjustmentDirection;
  /** Signed difference in whole ARS pesos: negative when the package lands under. */
  deltaArs: number;
  /** Full sentence for the hero layout: `Queda $1.741 abajo de 1 PAP`. */
  sentence: string;
  /** Compact cell for the spec layout: `−$1.741`, `+$3.421`, `coincide exacto`. */
  compact: string;
}

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
 * The real difference between what the package is worth and what the trade hands
 * over for it — the number that replaces `real 0,97 PAP`.
 *
 * `priceArs` is the package's own traded price (`papValue × 1 PAP`), not the
 * shop-wide configuration: the card then compares two figures the store already
 * agreed on, so a re-priced catalog can never make the card disagree with what
 * `createTradeProposal` will actually verify.
 *
 * A difference that rounds to zero pesos is reported as coinciding exactly. The
 * alternative — printing `Queda $0 abajo` — is true at the cent and useless at
 * the peso the rest of the card speaks.
 */
export function papAdjustment(
  catalog: CatalogPackageInfo,
  priceArs: number,
): PapAdjustmentCopy {
  const deltaArs = Math.round(catalog.realPriceArs - priceArs);

  if (deltaArs === 0) {
    return {
      direction: "exact",
      deltaArs,
      sentence: "Coincide exacto con 1 PAP",
      compact: "coincide exacto",
    };
  }

  const direction: PapAdjustmentDirection = deltaArs < 0 ? "below" : "above";
  const amount = formatArs(deltaArs);

  return {
    direction,
    deltaArs,
    sentence: `Queda ${amount} ${direction === "below" ? "abajo" : "arriba"} de 1 PAP`,
    // The minus sign is the typographic one (U+2212), not a hyphen: it aligns with
    // the plus in the other layout's column and reads as arithmetic, not as text.
    compact: `${direction === "below" ? "−" : "+"}${amount}`,
  };
}

/**
 * The containers a counted package holds: `9 envases de 500 ml`.
 *
 * Silence is the answer in the two cases where the words would be noise: a single
 * presentation (there is nothing to count) and a product counted in units, whose
 * quantity already reads `7 unidades` — `7 envases de 1 unidad` is not Spanish.
 * The same two drops decide the parenthetical `formatCatalogEquivalence` renders,
 * because two spellings of one printed number would be a bug.
 */
export function packagingLabel(catalog: CatalogPackageInfo): string | null {
  if (catalog.presentationCount <= 1) return null;
  if (catalog.measure === "unidad") return null;

  return `${catalog.presentationCount} envases de ${formatCatalogSize(
    catalog.presentationSize,
    catalog.measure,
  )}`;
}

/**
 * Where the producer is, as one line: `📍 985 km · Guadalupe Norte, Santa Fe`.
 *
 * Distance and address were two lines describing one fact — how far this is and
 * where — and the second one pushed the price out of the card's first screenful.
 */
export function locationLine(distanceKm: number, address: string): string {
  return `📍 ${distanceKm} km · ${address}`;
}
