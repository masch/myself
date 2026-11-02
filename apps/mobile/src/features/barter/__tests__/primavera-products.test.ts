import { describe, expect, it } from "bun:test";
import { PRIMAVERA_2026_PRODUCTS } from "../primavera-products";
import { PRIMAVERA_2026_CATALOG } from "../producer-catalog";
import { CATALOG_MEASURES } from "../catalog-package-facts";

/**
 * Pins the transcription of the printed product table, not the rendering of it:
 * every assertion here is a fact of "Primavera 26.pdf" that a bad re-extraction
 * would break (a row lost, a producer misattributed, a price read as text).
 */

const PRODUCTS = PRIMAVERA_2026_PRODUCTS;
const PRICE_COLUMNS = PRODUCTS.map(([, , name, unit, final]) => ({
  name,
  unit,
  final,
}));

describe("Primavera 2026 product catalog transcription", () => {
  it("carries every printed product once, numbered 1…1527", () => {
    expect(PRODUCTS).toHaveLength(1527);

    const numbers = PRODUCTS.map(([number]) => number);
    expect(numbers).toEqual(Array.from({ length: 1527 }, (_, i) => i + 1));
  });

  it("attributes every product to a printed producer, and every producer has one", () => {
    const producerNumbers = new Set(
      PRIMAVERA_2026_CATALOG.map((e) => e.number),
    );
    expect(producerNumbers.size).toBe(158);

    for (const [, producerNumber] of PRODUCTS) {
      expect(producerNumbers.has(producerNumber)).toBe(true);
    }

    const covered = new Set(
      PRODUCTS.map(([, producerNumber]) => producerNumber),
    );
    expect(covered.size).toBe(158);
  });

  it("gives every product a printed name and at least one price in cents", () => {
    for (const [, , name, unit, final] of PRODUCTS) {
      expect(name.trim().length).toBeGreaterThan(0);
      expect(unit !== null || final !== null).toBe(true);
      for (const price of [unit, final]) {
        if (price !== null) {
          expect(Number.isInteger(price)).toBe(true);
          expect(price).toBeGreaterThan(0);
        }
      }
    }
  });

  it("splits the two printed price columns the way the PDF prints them", () => {
    const counts = PRICE_COLUMNS.reduce(
      (acc, { unit, final }) => {
        const key = `${unit !== null}:${final !== null}`;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Measured from the text layer: 127 rows print both columns, 59 print the
    // unit column alone (plants and seeds, sold per unit) and 1341 print the
    // final price alone (one sealed presentation).
    expect(counts).toEqual({
      "true:true": 127,
      "true:false": 59,
      "false:true": 1341,
    });
  });

  it("reads one printed presentation as the ratio of the two printed prices", () => {
    for (const [number, , , unit, final, size] of PRODUCTS) {
      if (unit === null || final === null) continue;

      // The PDF prints the per-measure price and the price of the printed pack;
      // their ratio is that pack's size, so a misread decimal breaks this.
      expect(size).toBeCloseTo(final / unit, 4);

      if (!Number.isFinite(size) || size <= 0) {
        throw new Error(
          `product ${number}: unusable presentation size ${size}`,
        );
      }
    }
  });

  it("states a measure the derivation can reason about", () => {
    for (const [number, , name, , , size, measure] of PRODUCTS) {
      expect(CATALOG_MEASURES).toContain(measure);
      expect(size).toBeGreaterThan(0);
      if (!Number.isFinite(size)) {
        throw new Error(`product ${number} (${name}): size ${size}`);
      }
    }
  });

  it("prices a printed bundle by count even when the PDF also prints a unit price", () => {
    // A row that prints both columns is one the PDF sells by measure — except a
    // printed bundle, whose first price is per unit and whose presentation is
    // the box: "12 unid. Mixto X 300grs", "caja x 18 u". Those stay counts; the
    // ratio of the two prices is the number of items, not a weight.
    const bundle =
      /\b(?:\d+\s*(?:unidades?|unid\.?|u|cajas?|paquetes?|bolsas?)|(?:pack|combo|kit))\b/i;
    const byCount = PRODUCTS.filter(
      ([, , , unit, final, , measure]) =>
        unit !== null && final !== null && measure === "unidad",
    );

    expect(byCount.length).toBeGreaterThan(1);
    for (const [number, , name, , , size] of byCount) {
      expect(bundle.test(name)).toBe(true);
      if (!Number.isInteger(size)) {
        throw new Error(
          `product ${number} (${name}): non-integer count ${size}`,
        );
      }
    }
  });

  it("never calls a loose product a kilo or litro it cannot weigh", () => {
    // The derivation reads `measure` to decide between a weighable package and a
    // whole-unit one, so a row that prints a per-measure price must name the
    // measure — except the 59 plants and seeds, which print a per-unit price and
    // no size at all.
    const weighable = PRODUCTS.filter(
      ([, , , unit, , , measure]) =>
        unit !== null && (measure === "kg" || measure === "litro"),
    );
    const byCount = PRODUCTS.filter(
      ([, , , unit, , , measure]) => unit !== null && measure === "unidad",
    );

    expect(weighable.length + byCount.length).toBe(186);
    expect(byCount).toHaveLength(63);
  });

  it("reads a printed bundle as a count of units, never as kilos", () => {
    // The PDF prices a bundle and prints its count ("12 unid. Mixto X 300grs",
    // "caja x 18 u"). Reading the count as the measure size turns twelve packets
    // into 12 kg, which is what the review caught: the tuple contract says the
    // size is how much of `measure` one presentation holds.
    const bundle =
      /\b\d+\s*(?:unidades?|unid\.?|botellas?|frascos?|latas?|potes?|bolsas?|cajas?|paquetes?|u)\b/i;
    const bundles = PRODUCTS.filter(([, , name]) => bundle.test(name));

    expect(bundles.length).toBeGreaterThanOrEqual(30);
    for (const [number, , name, , , size, measure] of bundles) {
      expect(measure).toBe("unidad");
      expect(Number.isInteger(size)).toBe(true);
      if (size < 1)
        throw new Error(`product ${number} (${name}): size ${size}`);
    }
  });

  it("reads the volume spellings the text layer carries", () => {
    const byNumber = new Map(PRODUCTS.map((row) => [row[0], row]));

    // "x 500c." is half a litre, "x 1 ltr" is one litre and "x 1/2 ltr" is half.
    expect(byNumber.get(161)?.slice(5)).toEqual([0.5, "litro"]);
    expect(byNumber.get(1190)?.slice(5)).toEqual([1, "litro"]);
    expect(byNumber.get(1309)?.slice(5)).toEqual([0.5, "litro"]);
  });

  it("never mistakes the container a product is for with its own size", () => {
    // #1426: "X unidad para baldes de 20lts" is one bag for a 20-litre bucket,
    // not 20 litres of bag.
    const byNumber = new Map(PRODUCTS.map((row) => [row[0], row]));

    expect(byNumber.get(1426)?.slice(5)).toEqual([1, "unidad"]);
    expect(byNumber.get(1427)?.slice(5)).toEqual([20, "unidad"]);
    expect(byNumber.get(111)?.slice(5)).toEqual([12, "unidad"]);
    // The three abbreviations of the same "doce unidades" box.
    expect(byNumber.get(669)?.slice(5)).toEqual([12, "unidad"]);
    expect(byNumber.get(670)?.slice(5)).toEqual([12, "unidad"]);
    expect(byNumber.get(1401)?.slice(5)).toEqual([12, "unidad"]);
    expect(byNumber.get(712)?.slice(5)).toEqual([18, "unidad"]);
  });

  it("prices the products the app already knew exactly as the PDF prints them", () => {
    const byNumber = new Map(PRODUCTS.map((row) => [row[0], row]));

    // #5: Queso Gouda, horma de aprox. 3 kg — $22.158,20 por kg, $66.474,60 la horma.
    expect(byNumber.get(5)?.slice(3)).toEqual([2215820, 6647460, 3, "kg"]);
    // #1: Aceite de girasol x 1/2 litro — a sealed half litre, no unit price.
    expect(byNumber.get(1)?.slice(3)).toEqual([null, 536207, 0.5, "litro"]);
    // #890: Vermut Rosso x 750 ml, the printed row behind the POC's pack of four.
    expect(byNumber.get(890)?.slice(3)).toEqual([null, 1397000, 0.75, "litro"]);
  });
});
