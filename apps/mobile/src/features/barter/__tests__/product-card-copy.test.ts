import { describe, expect, it } from "bun:test";
import {
  deriveCatalogPackage,
  type CatalogPackageInfo,
} from "../catalog-packages";
import {
  formatArs,
  formatPrintedPrice,
  distanceLabel,
  packagingLabel,
  papAdjustment,
} from "../product-card-copy";

/**
 * The card's copy is the one place where a printed price, a counted quantity and
 * a rounding land in the same sentence, so it is pinned on real printed facts
 * instead of hand-written catalog objects: a fixture that drifts from
 * `deriveCatalogPackage` would let the card lie with a green suite.
 */

const PAP_CONFIG_ARS = 50000;

/** `[product, producer, name, unitPrice, finalPrice, presentationSize, measure]` */
type Facts = Parameters<typeof deriveCatalogPackage>[0];

function derive(facts: Facts): {
  catalog: CatalogPackageInfo;
  priceArs: number;
} {
  const derived = deriveCatalogPackage(facts, PAP_CONFIG_ARS);

  return { catalog: derived.catalog, priceArs: derived.priceArs };
}

/** #1: Aceite girasol x 1/2 litro pet, $5.362,07 la botella → 9 botellas. */
const HALF_LITRE_OIL: Facts = [
  1,
  1,
  "Aceite girasol x 1/2 litro pet",
  null,
  536207,
  0.5,
  "litro",
];
/** #838: Aceite girasol x 1 litro pet, $8.903,46 la botella → 6 botellas. */
const LITRE_OIL: Facts = [
  838,
  1,
  "Aceite girasol x 1 litro pet",
  null,
  890346,
  1,
  "litro",
];
/** #5: Gouda at $22.158,20 por kg, sold by measure → exactly 1 PAP. */
const GOUDA: Facts = [5, 1, "Queso gouda a granel", 2215820, null, 1, "kg"];
/** #890: Vermut Rosso x 750 ml at $13.970,00 → 4 botellas, four is above 1 PAP. */
const VERMOUTH: Facts = [
  890,
  1,
  "Vermut Rosso x 750 ml",
  null,
  1397000,
  0.75,
  "litro",
];
/** #1141: one presentation already worth more than 1 PAP. */
const ONE_HEAVY_UNIT: Facts = [
  1141,
  1,
  "Horma de queso",
  null,
  6647460,
  1,
  "unidad",
];

describe("papAdjustment states the rounding in pesos, not in fractions", () => {
  it("says a counted package lands below 1 PAP", () => {
    // 9 × $5.362,07 = $48.258,63 against the $50.000 the trade asks for.
    const { catalog, priceArs } = derive(HALF_LITRE_OIL);
    const adjustment = papAdjustment(catalog, priceArs);

    expect(adjustment.direction).toBe("below");
    expect(adjustment.deltaArs).toBe(-1741);
    expect(adjustment.sentence).toBe("Queda $1.741 abajo de 1 PAP");
    expect(adjustment.compact).toBe("−$1.741");
  });

  it("says a counted package lands above 1 PAP", () => {
    // 6 × $8.903,46 = $53.420,76.
    const { catalog, priceArs } = derive(LITRE_OIL);
    const adjustment = papAdjustment(catalog, priceArs);

    expect(adjustment.direction).toBe("above");
    expect(adjustment.deltaArs).toBe(3421);
    expect(adjustment.sentence).toBe("Queda $3.421 arriba de 1 PAP");
    expect(adjustment.compact).toBe("+$3.421");
  });

  it("says so when a weighed package is worth exactly the PAP it trades", () => {
    const { catalog, priceArs } = derive(GOUDA);
    const adjustment = papAdjustment(catalog, priceArs);

    expect(adjustment.direction).toBe("exact");
    expect(adjustment.deltaArs).toBe(0);
    expect(adjustment.sentence).toBe("Coincide exacto con 1 PAP");
    expect(adjustment.compact).toBe("coincide exacto");
  });

  it("quantifies the drift of a count that rounds up", () => {
    // 4 × $13.970,00 = $55.880,00, the figure the catalog task already pinned.
    const { catalog, priceArs } = derive(VERMOUTH);
    const adjustment = papAdjustment(catalog, priceArs);

    expect(adjustment.direction).toBe("above");
    expect(adjustment.sentence).toBe("Queda $5.880 arriba de 1 PAP");
  });

  it("keeps a single presentation worth more than 1 PAP honest", () => {
    // One horma is $66.474,60 and still trades as 1 PAP, so the card must say
    // what the trade really costs instead of hiding it behind a fraction.
    const { catalog, priceArs } = derive(ONE_HEAVY_UNIT);
    const adjustment = papAdjustment(catalog, priceArs);

    expect(adjustment.direction).toBe("above");
    expect(adjustment.sentence).toBe("Queda $16.475 arriba de 1 PAP");
  });

  it("never states a fraction of a PAP", () => {
    for (const facts of [HALF_LITRE_OIL, LITRE_OIL, GOUDA, VERMOUTH]) {
      const { catalog, priceArs } = derive(facts);
      const adjustment = papAdjustment(catalog, priceArs);

      expect(adjustment.sentence).not.toContain("real ");
      expect(adjustment.compact).not.toContain("real ");
    }
  });
});

describe("packagingLabel names the containers only when there are some", () => {
  it("counts the printed presentations a counted package holds", () => {
    const { catalog } = derive(HALF_LITRE_OIL);

    expect(packagingLabel(catalog)).toBe("9 envases de 500 ml");
  });

  it("says nothing when there is a single presentation", () => {
    const { catalog } = derive(GOUDA);

    expect(packagingLabel(catalog)).toBeNull();
    expect(packagingLabel(derive(ONE_HEAVY_UNIT).catalog)).toBeNull();
  });

  it("says nothing for a counted product, whose quantity already counts", () => {
    // `7 unidades` would become `7 envases de 1 unidad`, which is not Spanish.
    const { catalog } = derive(ONE_HEAVY_UNIT);

    expect(catalog.measure).toBe("unidad");
    expect(packagingLabel(catalog)).toBeNull();
  });
});

describe("the card's money writes the number the catalog prints", () => {
  it("keeps the cents of a printed price", () => {
    expect(formatPrintedPrice(5362.07)).toBe("$5.362,07");
    expect(formatPrintedPrice(13970)).toBe("$13.970,00");
  });

  it("writes a difference in whole pesos", () => {
    expect(formatArs(-1741.37)).toBe("$1.741");
    expect(formatArs(3420.76)).toBe("$3.421");
    expect(formatArs(0)).toBe("$0");
  });
});

describe("distanceLabel states the distance on its own", () => {
  it("writes the kilometres the origin block leads with", () => {
    // The distance used to share one grey line with the address
    // (`📍 985 km · Guadalupe Norte, Santa Fe`). It is now the comparable number
    // of the origin block, so it is written alone and without the pin: an emoji
    // in front of the one figure the eye compares across cards is noise.
    expect(distanceLabel(12)).toBe("a 12 km");
    expect(distanceLabel(985)).toBe("a 985 km");
  });
});
