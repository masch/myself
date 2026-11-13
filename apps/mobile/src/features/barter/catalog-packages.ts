import { DEFAULT_PAP_VALUE_ARS, type ProductPackage } from "@myself/shared";
import {
  PRODUCT_FINAL_PRICE,
  PRODUCT_MEASURE,
  PRODUCT_NAME,
  PRODUCT_PRESENTATION_SIZE,
  PRODUCT_PRODUCER,
  PRODUCT_PRODUCT,
  PRODUCT_UNIT_PRICE,
  type CatalogMeasure,
  type CatalogPackageFacts,
} from "./catalog-package-facts";
import { PRIMAVERA_2026_CATALOG } from "./producer-catalog";
import { PRIMAVERA_2026_PRODUCTS } from "./primavera-products";

/**
 * The single owner of the printed-price → PAP correspondence for the Primavera
 * 2026 catalog: one printed row becomes one package that hands over what is
 * worth exactly **1 PAP**.
 *
 * The user's rule is that the **quantity** is the variable, never the price:
 *
 * - a product the catalog sells by measure (`x kilo/unid.` on a kilo or a
 *   litro) is weighed out, so the package holds `1 PAP / unit price` of it —
 *   `$22.158,20/kg` of Gouda becomes **2,26 kg**, exactly 1 PAP.
 * - every other product is a sealed presentation, so the package holds a whole
 *   count: `k = round(1 PAP / printed price)`, at least one (`$13.970,00` vermut
 *   → **4 botellas**). One presentation already worth more than 1 PAP keeps that
 *   one presentation and takes the nearest whole PAP as its count.
 *
 * The printed price is disclosed, never replaced (S4): every package carries the
 * price the PDF prints (`listPriceArs`), what that price buys
 * (`listPriceBasis`), the quantity handed over (`quantity` + `measure`), the
 * presentation count and size, the real ARS value of that quantity
 * (`realPriceArs`) and its exact fraction in PAP (`realPapValue`).
 *
 * Why the count stays whole (S6): `createTradeProposal` derives `totalPap`
 * through `calculatePapValue(priceArs, papConfig)`, which refuses a price that
 * is not an exact multiple of the PAP configuration. So `priceArs` is always
 * `papValue * papConfig` and the honest value of the package lives in
 * `catalog.realPriceArs` / `catalog.realPapValue`, where the screen shows the
 * difference instead of hiding it (S5).
 *
 * Money stays integer cents until the final division: a whole count multiplies
 * cents, so its ARS value never drifts by a floating-point hair.
 */

/** Every catalog package id is this prefix plus the product number it prints. */
export const CATALOG_PACKAGE_ID_PREFIX = "cat-";

/**
 * How many packages of a catalog product are on offer (S7).
 *
 * The PDF prints no stock, so every catalog package takes one documented
 * default rather than an invented number: one presentation of 1 PAP on offer,
 * the same way the printed catalog prints no address and the producers took a
 * documented centroid.
 */
export const CATALOG_STOCK_UNITS = 1;

/**
 * What a printed package discloses beside its 1-PAP equivalence.
 *
 * All the numbers come from the printed row, so a user can compare the price
 * the catalog loaded with the price this app gives it (S4).
 */
export interface CatalogPackageInfo {
  /** How much of `measure` one package hands over. */
  quantity: number;
  /** The measure that quantity is expressed in. */
  measure: CatalogMeasure;
  /** How many printed presentations the package holds. */
  presentationCount: number;
  /** How much of `measure` one printed presentation holds. */
  presentationSize: number;
  /** The price the PDF prints, in ARS. */
  listPriceArs: number;
  /** What that printed price buys: `por kg`, `por 3 kg`, `por unidad`. */
  listPriceBasis: string;
  /** What the handed quantity really costs in ARS. */
  realPriceArs: number;
  /** `realPriceArs` as an exact PAP fraction — the difference to disclose. */
  realPapValue: number;
}

/**
 * A package every one of whose printed facts is known: the four POC packages
 * carry no `catalog` block, but a catalog package always does, so the screen can
 * read the disclosure without re-checking it.
 */
export type CatalogProductPackage = ProductPackage & {
  catalog: CatalogPackageInfo;
};

/** One printed row, as the package the barter trades. */
export interface DerivedCatalogPackage {
  /** Whole PAP units: the count the existing 1:1 barter trades. */
  papValue: number;
  /** Exactly `papValue * papConfigArs`, the only price the store verifies. */
  priceArs: number;
  catalog: CatalogPackageInfo;
}

/**
 * Rounds a quantity so the disclosed number is the number the derivation
 * actually computed and not a floating-point tail: whole counts stay whole, and
 * a measured quantity keeps four decimals, because a 0,3 g sachet is 0,0048 kg
 * of product and two decimals would round it away to nothing.
 */
function roundQuantity(quantity: number, measure: CatalogMeasure): number {
  if (measure === "unidad") return Math.round(quantity);
  return Math.round(quantity * 10000) / 10000;
}

/** Spanish decimals, so a disclosed size reads like the printed catalog does. */
function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1000) / 1000).replace(".", ",");
}

/**
 * A presentation size in the unit a producer reads: `360 g` rather than
 * `0,36 kg`, `750 ml` rather than `0,75 litro`.
 *
 * Exported because the card renders the same size beside the presentation count
 * (`8 × 70 g`), and two spellings of one printed number would be a bug.
 */
export function formatCatalogSize(
  size: number,
  measure: CatalogMeasure,
): string {
  if (measure === "unidad") return size === 1 ? "unidad" : `${size} unidades`;

  if (size < 1) {
    const small = Math.round(size * 1000);
    return measure === "kg" ? `${small} g` : `${small} ml`;
  }

  const noun = measure === "kg" ? "kg" : "litro";
  return `${formatNumber(size)} ${noun}${noun === "kg" || size === 1 ? "" : "s"}`;
}

/**
 * How much of the product a package hands over, in the unit a producer reads:
 * `2,26 kg` of cheese, `3 litros` of vermouth, `7 unidades` of tintura.
 *
 * Same vocabulary as `formatCatalogSize`, one step further: a quantity below one
 * whole unit is spelled in grams or millilitres (`480 g`), and the decimal is the
 * Spanish comma. The measured families keep two decimals, so the disclosed
 * number is what the screen can carry — `2,2565` kg is printed as `2,26 kg` — and
 * no printed row ever publishes a floating-point tail or a machine-format period.
 */
export function formatCatalogQuantity(
  quantity: number,
  measure: CatalogMeasure,
): string {
  if (measure === "unidad") {
    const count = Math.round(quantity);
    return `${count} ${count === 1 ? "unidad" : "unidades"}`;
  }

  // Below one whole unit the printed catalog speaks in grams and millilitres,
  // which is also the only way a sub-kilo quantity stays readable.
  const small = Math.round(quantity * 1000);
  if (small < 1000) {
    return `${small} ${measure === "kg" ? "g" : "ml"}`;
  }

  const rounded = Math.round(quantity * 100) / 100;
  const noun = measure === "kg" ? "kg" : "litro";
  return `${formatNumber(rounded)} ${noun}${
    noun === "kg" || rounded === 1 ? "" : "s"
  }`;
}

/**
 * A printed size inside a product name: `x 5 kg`, `x 1/2 litro`, `x 150grs`,
 * `x 660 CC.`, `x 4,75 lt.`.
 *
 * The printed catalog spells the same measure fourteen ways (`grs`, `gs`, `gr`,
 * `k`, `kilos`, `cc`, `lts`…), so the token is a tolerant alternation rather
 * than a grammar. A trailing `(?![a-záéíóúñü])` keeps a single-letter unit from
 * matching inside a word.
 *
 * A count is deliberately **not** a size: `x 6 unidades` or `x unid.` prints how
 * many pieces one package holds, which the buyer needs, so it stays in the name.
 */
const PRINTED_SIZE_SOURCE =
  "[xX]\\s*(?:aprox\\.?\\s*)?\\d+(?:[.,]\\d+)?(?:\\s*\\/\\s*\\d+)?\\s*(?:mililitros?|kilos?|gramos?|litros?|kgs?|grs?|lts?|cc|ml|gr|gs|kg|lt|g|l|k)\\.?(?![a-záéíóúñü])";

/** Collapses the whitespace a removed token leaves behind. */
function tidyTitle(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[\s.,;:·-]+/, "")
    .replace(/[\s.,;:·-]+$/, "");
}

/**
 * The product name without the printed size it carries.
 *
 * The catalog derives every number it discloses from the printed columns
 * (`presentationSize`, `measure`, the two prices), so the size inside the name is
 * the one duplicated fact a card would say twice: the title would read
 * `Aceite girasol x 1 litro pet` under a badge that already states what one PAP
 * hands over. Removing it here keeps the transcription in
 * `primavera-products.ts` exactly as the PDF prints it — the tuple stays the
 * re-checkable evidence — and only the card loses the repetition.
 *
 * Only the **last** token goes, because the earlier ones belong to a compound
 * name (`Galletas de Maíz morado x 40 g (saborizadas …)`), and a name that is
 * nothing but a size keeps its original text rather than becoming empty.
 */
export function stripPrintedSize(name: string): string {
  let last: RegExpExecArray | null = null;

  for (const match of name.matchAll(new RegExp(PRINTED_SIZE_SOURCE, "gi"))) {
    last = match;
  }

  if (!last) return tidyTitle(name);

  const candidate = tidyTitle(
    `${name.slice(0, last.index)} ${name.slice(last.index + last[0].length)}`,
  );

  return candidate.length > 1 ? candidate : tidyTitle(name);
}

/**
 * What one measure of the product costs, in printed cents — the only fair way to
 * compare two presentations of the same good.
 *
 * A row the catalog sells by measure prints that price directly. A sealed
 * presentation prints what the container costs, so its per-measure price is that
 * price divided by how much the container holds.
 */
function printedPricePerMeasure(facts: CatalogPackageFacts): number {
  const unitPrice = facts[PRODUCT_UNIT_PRICE];
  const measure = facts[PRODUCT_MEASURE];

  if (unitPrice !== null && (measure === "kg" || measure === "litro")) {
    return unitPrice;
  }

  const presentationPrice = facts[PRODUCT_FINAL_PRICE] ?? unitPrice;
  const size = facts[PRODUCT_PRESENTATION_SIZE];

  if (presentationPrice === null) return Number.POSITIVE_INFINITY;

  return size > 0 ? presentationPrice / size : presentationPrice;
}

/**
 * The key that makes two rows the same product on the gondola: one producer and
 * one name, with the printed size already gone.
 */
function productKey(producerId: string, title: string): string {
  return `${producerId}::${title.toLowerCase()}`;
}

/**
 * Derives one package from one printed row.
 *
 * `papConfigArs` is the ARS value of 1 PAP; it defaults to the shop-wide
 * configuration and is passed explicit only where the caller already knows it.
 */
export function deriveCatalogPackage(
  facts: CatalogPackageFacts,
  papConfigArs: number = DEFAULT_PAP_VALUE_ARS,
): DerivedCatalogPackage {
  if (papConfigArs <= 0) {
    throw new Error("PAP configuration value must be strictly positive");
  }

  const unitPriceCents = facts[PRODUCT_UNIT_PRICE];
  const finalPriceCents = facts[PRODUCT_FINAL_PRICE];
  const presentationSize = facts[PRODUCT_PRESENTATION_SIZE];
  const measure = facts[PRODUCT_MEASURE];

  // Sold by measure: the buyer chooses the amount, so the quantity is what
  // makes the package worth exactly 1 PAP.
  if (unitPriceCents !== null && (measure === "kg" || measure === "litro")) {
    const listPriceArs = unitPriceCents / 100;

    return {
      papValue: 1,
      priceArs: papConfigArs,
      catalog: {
        quantity: roundQuantity(papConfigArs / listPriceArs, measure),
        measure,
        presentationCount: 1,
        presentationSize,
        listPriceArs,
        listPriceBasis: `por ${measure}`,
        realPriceArs: papConfigArs,
        realPapValue: 1,
      },
    };
  }

  // Everything else is a whole count of sealed presentations. `Precio final` is
  // what one presentation costs; a row that prints only a per-unit price (the
  // plants and seeds) sells one unit, so that price is what one presentation
  // costs too.
  const presentationPriceCents = finalPriceCents ?? unitPriceCents;

  if (presentationPriceCents === null) {
    throw new Error(
      `Printed product ${facts[PRODUCT_PRODUCT]} prints no price for its presentation`,
    );
  }

  const listPriceArs = presentationPriceCents / 100;
  const presentationCount = Math.max(
    1,
    Math.round(papConfigArs / listPriceArs),
  );
  const realPriceArs = (presentationCount * presentationPriceCents) / 100;
  const realPapValue = realPriceArs / papConfigArs;
  const papValue = Math.max(1, Math.round(realPapValue));

  return {
    papValue,
    priceArs: papValue * papConfigArs,
    catalog: {
      quantity: roundQuantity(presentationCount * presentationSize, measure),
      measure,
      presentationCount,
      presentationSize,
      listPriceArs,
      listPriceBasis: `por ${formatCatalogSize(presentationSize, measure)}`,
      realPriceArs,
      realPapValue,
    },
  };
}

/**
 * The printed catalog as packages: one per printed row, in printed order.
 *
 * The producer is the entry the row's producer number resolves to, so a package
 * can never point at a producer the catalog does not print — a number that does
 * not resolve throws instead of dropping the product silently, because a
 * dropped row is a product the user cannot trade and nobody would notice.
 *
 * One card per product name per producer (S8): the printed catalog offers the
 * same good in two or three presentations (`Harina de trigo blanca 000 x 5kg`,
 * `x 10 kg`, `x 25kg`). With the printed size out of the title those rows would
 * render as identical cards, so only the row with the **best price per measure**
 * survives — dropping the format means the price that remains should be the one
 * least inflated by packaging. A tie keeps the row the PDF prints first, so the
 * choice is reproducible from the document alone.
 */
export function catalogPackages(
  papConfigArs?: number,
): CatalogProductPackage[] {
  const producers = new Map(
    PRIMAVERA_2026_CATALOG.map((entry) => [entry.number, entry]),
  );

  const survivors = new Map<
    string,
    { pkg: CatalogProductPackage; pricePerMeasure: number }
  >();

  for (const facts of PRIMAVERA_2026_PRODUCTS) {
    const product = facts[PRODUCT_PRODUCT];
    const producerNumber = facts[PRODUCT_PRODUCER];
    const producer = producers.get(producerNumber);

    if (!producer) {
      throw new Error(
        `Printed product ${product} is attributed to producer ${producerNumber}, which the printed catalog does not carry`,
      );
    }

    const derived = deriveCatalogPackage(facts, papConfigArs);
    const title = stripPrintedSize(facts[PRODUCT_NAME]);
    const key = productKey(producer.id, title);
    const pricePerMeasure = printedPricePerMeasure(facts);
    const current = survivors.get(key);

    // Strictly cheaper, never equal: the earlier printed row keeps a tie.
    if (current && current.pricePerMeasure <= pricePerMeasure) continue;

    survivors.set(key, {
      pricePerMeasure,
      pkg: {
        id: `${CATALOG_PACKAGE_ID_PREFIX}${product}`,
        producerId: producer.id,
        title,
        productionType: producer.productionType,
        priceArs: derived.priceArs,
        papValue: derived.papValue,
        stockUnits: CATALOG_STOCK_UNITS,
        catalog: derived.catalog,
      },
    });
  }

  return [...survivors.values()]
    .map((entry) => entry.pkg)
    .sort((a, b) => printedNumber(a.id) - printedNumber(b.id));
}

/** The printed row a package id was built from, for restoring the printed order. */
function printedNumber(id: string): number {
  return Number(id.slice(CATALOG_PACKAGE_ID_PREFIX.length));
}
