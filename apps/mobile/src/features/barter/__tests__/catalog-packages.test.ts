import { describe, expect, it } from "bun:test";
import { DEFAULT_PAP_VALUE_ARS } from "@myself/shared";
import {
  CATALOG_PACKAGE_ID_PREFIX,
  CATALOG_STOCK_UNITS,
  catalogPackages,
  deriveCatalogPackage,
  formatCatalogQuantity,
  formatCatalogSize,
  stripPrintedSize,
} from "../catalog-packages";
import type {
  CatalogMeasure,
  CatalogPackageFacts,
} from "../catalog-package-facts";
import { PRIMAVERA_2026_PRODUCTS } from "../primavera-products";
import {
  PRIMAVERA_2026_CATALOG,
  PRIMAVERA_2026_PRODUCERS,
} from "../producer-catalog";

/**
 * Pins the price→PAP correspondence the user asked for (S2): the quantity is
 * the variable, so a package hands over what is worth exactly 1 PAP, and the
 * printed price stays beside it (S4). Every number asserted below is arithmetic
 * over one printed row of the Primavera 2026 table, never a stored constant.
 */

const PRODUCTS = PRIMAVERA_2026_PRODUCTS;

/** The printed row of one product number, so a test never counts commas. */
function row(product: number): CatalogPackageFacts {
  const found = PRODUCTS.find(([number]) => number === product);

  if (!found) {
    throw new Error(`The printed table carries no product ${product}`);
  }

  return found;
}

/** A row the table does not carry, for a case the printed rows do not show. */
function madeUpRow(
  unitPrice: number | null,
  finalPrice: number | null,
  presentationSize: number,
  measure: CatalogMeasure,
): CatalogPackageFacts {
  return [
    9999,
    1,
    "Producto de prueba",
    unitPrice,
    finalPrice,
    presentationSize,
    measure,
  ];
}

describe("deriveCatalogPackage — sold by measure", () => {
  it("hands over the amount of a weighed product that is worth 1 PAP", () => {
    // #5: Queso Gouda, $22.158,20 por kg, horma de aprox. 3 kg: $50.000 buy
    // 2,26 kg, so the package is 2,26 kg and it is exactly 1 PAP.
    const derived = deriveCatalogPackage(row(5));

    expect(derived.papValue).toBe(1);
    expect(derived.priceArs).toBe(50000);
    expect(derived.catalog).toEqual({
      quantity: 2.2565,
      measure: "kg",
      presentationCount: 1,
      presentationSize: 3,
      listPriceArs: 22158.2,
      listPriceBasis: "por kg",
      realPriceArs: 50000,
      realPapValue: 1,
    });
  });

  it("grows the quantity with the price per kilo, never the PAP count", () => {
    // #55: Maíz pisingallo x 5 k, $3.588 por kg: $50.000 buy 13,94 kg.
    const derived = deriveCatalogPackage(row(55));

    expect(derived.catalog.quantity).toBeCloseTo(13.94, 2);
    expect(derived.catalog.listPriceArs).toBe(3588);
    expect(derived.papValue).toBe(1);
    expect(derived.priceArs).toBe(DEFAULT_PAP_VALUE_ARS);
  });

  it("derives the measured family from the PAP configuration it is given", () => {
    // 1 PAP = $60.000 buys 60.000 / 22.158,2 = 2,71 kg of the same cheese.
    const derived = deriveCatalogPackage(row(5), 60000);

    expect(derived.catalog.quantity).toBeCloseTo(2.71, 2);
    expect(derived.priceArs).toBe(60000);
    expect(derived.catalog.realPriceArs).toBe(60000);
  });
});

describe("deriveCatalogPackage — whole presentations", () => {
  it("counts whole bottles when the printed price is per bottle", () => {
    // #890: Vermut Rosso x 750 ml, $13.970 la botella: four bottles are
    // $55.880, which is 1,1176 PAP, so the package is four bottles and 1 PAP.
    const derived = deriveCatalogPackage(row(890));

    expect(derived.papValue).toBe(1);
    expect(derived.priceArs).toBe(50000);
    expect(derived.catalog).toEqual({
      quantity: 3,
      measure: "litro",
      presentationCount: 4,
      presentationSize: 0.75,
      listPriceArs: 13970,
      listPriceBasis: "por 750 ml",
      realPriceArs: 55880,
      realPapValue: 1.1176,
    });
  });

  it("counts whole halves when one presentation is worth less than 1 PAP", () => {
    // #1: Aceite de girasol x 1/2 litro, $5.362,07 la botella: nine half litres
    // are $48.258,63, which is 0,9652 PAP.
    const derived = deriveCatalogPackage(row(1));

    expect(derived.papValue).toBe(1);
    expect(derived.priceArs).toBe(50000);
    expect(derived.catalog.presentationCount).toBe(9);
    expect(derived.catalog.quantity).toBe(4.5);
    expect(derived.catalog.listPriceArs).toBe(5362.07);
    expect(derived.catalog.listPriceBasis).toBe("por 500 ml");
    expect(derived.catalog.realPriceArs).toBe(48258.63);
    expect(derived.catalog.realPapValue).toBeCloseTo(0.9652, 4);
  });

  it("keeps one presentation when that presentation is already worth 1 PAP", () => {
    // A $66.474,60 horma is more than 1 PAP: the package is the one horma and
    // its PAP count is the nearest whole one, never a fraction (S3).
    const derived = deriveCatalogPackage(madeUpRow(null, 6647460, 3, "kg"));

    expect(derived.catalog.presentationCount).toBe(1);
    expect(derived.catalog.quantity).toBe(3);
    expect(derived.papValue).toBe(1);
    expect(derived.priceArs).toBe(50000);
    expect(derived.catalog.realPriceArs).toBeCloseTo(66474.6, 6);
    expect(derived.catalog.realPapValue).toBeCloseTo(1.3295, 4);
  });

  it("rounds the PAP count up to the nearest whole one above 1,5 PAP", () => {
    // A $499.500 unit is 9,99 PAP, so the package is one unit worth 10 PAP.
    const derived = deriveCatalogPackage(
      madeUpRow(null, 49950000, 1, "unidad"),
    );

    expect(derived.papValue).toBe(10);
    expect(derived.priceArs).toBe(500000);
    expect(derived.catalog.presentationCount).toBe(1);
    expect(derived.catalog.listPriceBasis).toBe("por unidad");
    expect(derived.catalog.realPapValue).toBeCloseTo(9.99, 4);
  });

  it("treats the one row priced per box as a whole count, not a weight", () => {
    // #714: caja x 18 u, priced per unit and per box. Its measure is `unidad`,
    // so it is sold by count even though it prints both columns.
    const derived = deriveCatalogPackage(row(714));

    expect(derived.catalog.measure).toBe("unidad");
    expect(derived.catalog.presentationCount).toBe(2);
    expect(derived.catalog.quantity).toBe(36);
    expect(derived.catalog.listPriceBasis).toBe("por 18 unidades");
  });

  it("keeps one presentation when a per-unit price is the only price printed", () => {
    // #27: Tintura madre $7.352,42 the frasco: no presentation size, so it is a
    // whole count of seven frascos.
    const derived = deriveCatalogPackage(row(27));

    expect(derived.catalog.presentationCount).toBe(7);
    expect(derived.catalog.presentationSize).toBe(0.06);
    expect(derived.catalog.listPriceBasis).toBe("por 60 ml");
  });
});

describe("deriveCatalogPackage — the invariants the barter relies on", () => {
  it("never hands over a non-positive PAP count or a price that is not a whole PAP", () => {
    const problems: string[] = [];

    for (const printed of PRODUCTS) {
      const { papValue, priceArs, catalog } = deriveCatalogPackage(printed);
      const label = `#${printed[0]} ${printed[2]}`;

      if (!Number.isInteger(papValue) || papValue < 1) {
        problems.push(
          `${label}: papValue ${papValue} is not a positive integer`,
        );
      }

      if (priceArs !== papValue * DEFAULT_PAP_VALUE_ARS) {
        problems.push(
          `${label}: priceArs ${priceArs} is not ${papValue} × ${DEFAULT_PAP_VALUE_ARS}`,
        );
      }

      if (!(catalog.realPapValue > 0)) {
        problems.push(`${label}: realPapValue ${catalog.realPapValue}`);
      }

      if (!(catalog.quantity > 0)) {
        problems.push(`${label}: quantity ${catalog.quantity}`);
      }

      if (!(catalog.listPriceArs > 0)) {
        problems.push(`${label}: listPriceArs ${catalog.listPriceArs}`);
      }
    }

    expect(problems).toEqual([]);
  });

  it("discloses a fraction that never drifts more than half a PAP", () => {
    // The whole count is the nearest one to the honest value, so the disclosed
    // rounding is bounded: no row hides a package worth twice its PAP count.
    const problems: string[] = [];

    for (const printed of PRODUCTS) {
      const { papValue, catalog } = deriveCatalogPackage(printed);
      const deviation = Math.abs(catalog.realPapValue - papValue) / papValue;

      if (deviation > 0.5) {
        problems.push(
          `#${printed[0]} ${printed[2]}: ${catalog.realPapValue} vs ${papValue} PAP`,
        );
      }
    }

    expect(problems).toEqual([]);
  });
});

describe("catalogPackages", () => {
  it("seeds one package per product name per producer, in printed order", () => {
    const packages = catalogPackages();

    // The printed rows are 1527; one card per product name per producer keeps
    // 1374 of them — repeated presentations of one good collapse into their
    // best price per measure.
    expect(packages).toHaveLength(1374);
    expect(new Set(packages.map((pkg) => pkg.id)).size).toBe(1374);
    // cat-1 and cat-2 are one oil in two bottle sizes: the litre bottle has the
    // better per-litre price, so it opens the gondola and the half-litre drops.
    expect(packages[0].id).toBe("cat-2");
    expect(packages.at(-1)?.id).toBe("cat-1527");
  });

  it("carries the sizeless title of its surviving row and one documented default of stock", () => {
    const printed = new Map(
      PRIMAVERA_2026_PRODUCTS.map((row) => [
        `${CATALOG_PACKAGE_ID_PREFIX}${row[0]}`,
        row,
      ]),
    );
    const packages = catalogPackages();

    expect(packages.length).toBeLessThan(PRIMAVERA_2026_PRODUCTS.length);

    for (const pkg of packages) {
      const row = printed.get(pkg.id);

      // Every package still resolves to the printed row it survived from, and
      // the name it carries is that row's name with its printed size gone.
      expect(row, `${pkg.id} has no printed row`).toBeDefined();
      // The name it carries is exactly its row's name with the printed size
      // gone — never a hand-edited rewrite of what the PDF prints.
      expect(pkg.title).toBe(stripPrintedSize(row![2]));
      expect(pkg.stockUnits).toBe(CATALOG_STOCK_UNITS);
    }
  });

  it("attributes every surviving package to the producer its row sits under", () => {
    const producers = new Map(
      PRIMAVERA_2026_PRODUCERS.map((producer) => [producer.id, producer]),
    );
    const entries = new Map(
      PRIMAVERA_2026_CATALOG.map((entry) => [entry.number, entry]),
    );
    const printed = new Map(
      PRIMAVERA_2026_PRODUCTS.map((row) => [
        `${CATALOG_PACKAGE_ID_PREFIX}${row[0]}`,
        row,
      ]),
    );
    const packages = catalogPackages();

    for (const pkg of packages) {
      const row = printed.get(pkg.id);

      if (!row) {
        throw new Error(`The printed catalog carries no row for ${pkg.id}`);
      }

      const entry = entries.get(row[1]);

      if (!entry) {
        throw new Error(`The printed catalog carries no producer ${row[1]}`);
      }

      const producer = producers.get(pkg.producerId);

      if (!producer) {
        throw new Error(`The seeded producers carry no ${pkg.producerId}`);
      }

      expect(pkg.producerId).toBe(entry.id);
      expect(pkg.productionType).toBe(entry.productionType);
      expect(pkg.productionType).toBe(producer.productionType);
    }

    // Every printed producer still ends up with at least one package on the gondola.
    expect(new Set(packages.map((pkg) => pkg.producerId)).size).toBe(158);
  });

  it("derives every package with the PAP configuration it is given", () => {
    const packages = catalogPackages(60000);

    for (const pkg of packages) {
      expect(pkg.priceArs).toBe(pkg.papValue * 60000);
    }
  });
});

describe("what the printed price buys, spelled the way the catalog prints it", () => {
  it("names a small presentation in the unit a producer reads", () => {
    expect(formatCatalogSize(0.36, "kg")).toBe("360 g");
    expect(formatCatalogSize(0.75, "litro")).toBe("750 ml");
    expect(formatCatalogSize(1, "kg")).toBe("1 kg");
    expect(formatCatalogSize(1, "litro")).toBe("1 litro");
    expect(formatCatalogSize(2, "litro")).toBe("2 litros");
    expect(formatCatalogSize(4.75, "litro")).toBe("4,75 litros");
    expect(formatCatalogSize(1, "unidad")).toBe("unidad");
    expect(formatCatalogSize(18, "unidad")).toBe("18 unidades");
  });

  it("never publishes a machine-formatted size or a rounded-away quantity", () => {
    for (const pkg of catalogPackages()) {
      const { catalog } = pkg;

      // A printed user-facing size with a decimal point or a unitless number is
      // a locale leak, and `formatCatalogSize` is the only owner of that text.
      expect(catalog.listPriceBasis.startsWith("por ")).toBe(true);
      expect(catalog.listPriceBasis).not.toContain(".");
      expect(catalog.listPriceBasis).not.toMatch(/null|undefined|NaN/);

      // #953 prices 3 g sachets: the quantity must keep its grams, not round to
      // zero and fail the contract.
      expect(catalog.quantity).toBeGreaterThan(0);
    }
  });

  it("keeps a sub-gram presentation visible", () => {
    // #953: $32,00 per 3 g saquito, sixteen of them for 1 PAP → 48 g, a
    // quantity that a two-decimal kilogram would have rounded to zero.
    const derived = deriveCatalogPackage(row(953));

    expect(derived.catalog.quantity).toBeCloseTo(0.048, 4);
    expect(derived.catalog.listPriceBasis).toBe("por 3 g");
  });
});

describe("the quantity a package hands over, spelled the way the catalog speaks", () => {
  it("names a measured quantity with the printed size vocabulary", () => {
    // The Gouda package is 2,2565 kg of cheese: a screen that prints the raw
    // divided number would show a floating-point tail nobody can read.
    expect(formatCatalogQuantity(2.2565, "kg")).toBe("2,26 kg");
    expect(formatCatalogQuantity(13.94, "kg")).toBe("13,94 kg");
    expect(formatCatalogQuantity(3, "litro")).toBe("3 litros");
    expect(formatCatalogQuantity(1, "litro")).toBe("1 litro");
  });

  it("switches to grams and millilitres below one whole unit", () => {
    expect(formatCatalogQuantity(0.48, "kg")).toBe("480 g");
    expect(formatCatalogQuantity(0.048, "kg")).toBe("48 g");
    expect(formatCatalogQuantity(0.5, "litro")).toBe("500 ml");
  });

  it("counts whole units, singular included", () => {
    expect(formatCatalogQuantity(7, "unidad")).toBe("7 unidades");
    expect(formatCatalogQuantity(1, "unidad")).toBe("1 unidad");
  });

  it("never publishes a machine-formatted quantity for any printed row", () => {
    for (const pkg of catalogPackages()) {
      const text = formatCatalogQuantity(
        pkg.catalog.quantity,
        pkg.catalog.measure,
      );

      expect(text).not.toContain(".");
      expect(text).not.toMatch(/null|undefined|NaN/);
      expect(text).toMatch(
        /^\d+(,\d{1,2})? (kg|g|litro|litros|ml|unidad|unidades)$/,
      );
    }
  });
});
