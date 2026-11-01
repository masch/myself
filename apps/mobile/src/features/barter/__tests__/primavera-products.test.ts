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

  it("keeps the one bundle the PDF prices both per unit and per box", () => {
    // Every row that prints both columns is sold by kilo or litro — the first
    // price is a per-measure price — except #714, whose first price is per unit
    // and whose presentation is the printed "caja x 18 u". It is sold by count,
    // so it must not claim a weight it does not have.
    const byMeasure = PRODUCTS.filter(
      ([, , , unit, final]) => unit !== null && final !== null,
    ).filter(([, , , , , , measure]) => measure === "unidad");

    expect(byMeasure).toHaveLength(1);
    expect(byMeasure[0]?.slice(0, 2)).toEqual([714, 76]);
    expect(byMeasure[0]?.[5]).toBe(18);
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
    expect(byCount).toHaveLength(60);
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
