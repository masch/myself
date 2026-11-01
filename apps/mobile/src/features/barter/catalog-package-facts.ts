/**
 * One row of the Primavera 2026 product table, as the PDF prints it.
 *
 * The table prints three things the barter cares about: the product name, the
 * price per kilo/litro/unit (`x kilo/unid.`) and the price of one printed
 * presentation (`Precio final`). Which of the two prices a row carries is what
 * tells the two ways of selling apart, so the facts keep both, never a merged
 * "price":
 *
 * - a row that prints a **per-measure price** is sold by measure: the buyer
 *   chooses how much, so the package can hold exactly 1 PAP worth of it.
 * - a row that prints **only a final price** sells one sealed presentation: the
 *   package must hold a whole count of them.
 *
 * Prices are integer cents, because every derived amount (a count of
 * presentations times their price) is then exact integer arithmetic and no
 * package quantity drifts by a floating-point hair.
 */
export const CATALOG_MEASURES = ["kg", "litro", "unidad"] as const;

export type CatalogMeasure = (typeof CATALOG_MEASURES)[number];

/**
 * A printed row, as a tuple: `[product, producer, name, unitPrice, finalPrice,
 * presentationSize, measure]`.
 *
 * - `product` — the number the PDF prints in the row, 1…1527, unique.
 * - `producer` — the number the row sits under, 1…158; resolves against
 *   `PRIMAVERA_2026_CATALOG`.
 * - `unitPrice` — cents per `measure`, or `null` when the row prints no
 *   per-measure price.
 * - `finalPrice` — cents for one printed presentation, or `null` when the row
 *   is sold by measure only.
 * - `presentationSize` — how much of `measure` one printed presentation holds
 *   (`x 360 grs` → 0.36, `x 1/2 litro` → 0.5), `1` when the name states none or
 *   prices a bundle of containers.
 * - `measure` — what the product is measured in.
 */
export type CatalogPackageFacts = readonly [
  product: number,
  producer: number,
  name: string,
  unitPrice: number | null,
  finalPrice: number | null,
  presentationSize: number,
  measure: CatalogMeasure,
];

/** The columns by name, for reading a tuple without counting commas. */
export const PRODUCT_PRODUCT = 0;
export const PRODUCT_PRODUCER = 1;
export const PRODUCT_NAME = 2;
export const PRODUCT_UNIT_PRICE = 3;
export const PRODUCT_FINAL_PRICE = 4;
export const PRODUCT_PRESENTATION_SIZE = 5;
export const PRODUCT_MEASURE = 6;
