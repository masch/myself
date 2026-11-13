import { describe, expect, it } from "bun:test";

import { DEFAULT_PAP_VALUE_ARS } from "@myself/shared";

import { catalogPackages } from "../catalog-packages";

/**
 * One card per product name per producer.
 *
 * The printed catalog offers the same good in two or three presentations
 * (`Harina de trigo blanca 000 x 5kg`, `x 10 kg`, `x 25kg`). Once the printed
 * size leaves the title, those rows would render as three identical cards, so
 * the catalog keeps exactly one of them — the one whose printed price is the
 * best price per measure, because dropping the format means the price that
 * survives should be the least packaging-dependent one.
 */

/** A printed size the catalog no longer shows in a title. */
const PRINTED_SIZE =
  /\s[xX]\s*\d+(?:[.,]\d+)?\s*(?:kg|k\b|grs?\b|gr\b|g\b|cc\b|ml\b|lts?\b|lt\b|litros?\b)/i;

describe("catalogPackages — one card per product name", () => {
  const packages = catalogPackages(DEFAULT_PAP_VALUE_ARS);

  it("never offers two packages under the same title for one producer", () => {
    const seen = new Map<string, string>();

    for (const pkg of packages) {
      const key = `${pkg.producerId}::${pkg.title.trim().toLowerCase()}`;
      const previous = seen.get(key);

      expect(
        previous,
        `producer ${pkg.producerId} offers "${pkg.title}" twice: ${previous} and ${pkg.id}`,
      ).toBeUndefined();

      seen.set(key, pkg.id);
    }
  });

  it("keeps no printed size inside a title", () => {
    for (const pkg of packages) {
      expect(PRINTED_SIZE.test(pkg.title), `"${pkg.title}" (${pkg.id})`).toBe(
        false,
      );
    }
  });

  it("trims the title it leaves behind", () => {
    for (const pkg of packages) {
      expect(pkg.title, `${pkg.id} keeps stray whitespace`).toBe(
        pkg.title.replace(/\s+/g, " ").trim(),
      );
    }
  });

  it("drops the repeated presentations of one producer", () => {
    // Producer 42 prints one sugar in four formats; one card must remain.
    const sugar = packages.filter((pkg) =>
      pkg.title.toLowerCase().startsWith("azúcar mascabo"),
    );

    expect(sugar).toHaveLength(1);
  });

  it("keeps the presentation with the best price per measure", () => {
    // Producer 2 prints the same flour at x 5kg, x 10 kg and x 25kg; the 25 kg
    // row is the cheapest per kilo and therefore the one that survives.
    const flour = packages.find(
      (pkg) => pkg.title === "Harina de trigo blanca 000",
    );

    expect(flour?.id).toBe("cat-53");
  });

  it("keeps an x-count that is a package, not a size", () => {
    // "x 6 unidades" describes the bundle the buyer receives, so it is not a
    // printed size to strip.
    const boxes = packages.filter((pkg) =>
      pkg.title.toLowerCase().includes("x 6 unidades"),
    );

    expect(boxes.length).toBeGreaterThan(0);
  });

  it("leaves the surviving packages tradable", () => {
    for (const pkg of packages) {
      expect(pkg.papValue).toBeGreaterThanOrEqual(1);
      expect(pkg.priceArs).toBe(pkg.papValue * DEFAULT_PAP_VALUE_ARS);
      expect(pkg.catalog.quantity).toBeGreaterThan(0);
    }
  });
});
