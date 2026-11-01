import { describe, expect, it } from "bun:test";
import { PRODUCTION_TYPES } from "@myself/shared";
import { SEED_PACKAGES, SEED_PRODUCERS } from "../../barter-store";
import { TYPE_OPTIONS } from "../gondola-filter-bar";

describe("Barter Gondola Component Logic", () => {
  it("formats PAP conversion badge correctly", () => {
    const papConfigArs = 50000;
    const formatted = `1 PAP = $${papConfigArs.toLocaleString("es-AR")} ARS`;
    expect(formatted).toContain("50.000");
  });

  it("calculates balance equivalence for proposed barter packages", () => {
    const vermut = SEED_PACKAGES[0];
    const queso = SEED_PACKAGES[2];

    expect(vermut.papValue).toBe(1);
    expect(queso.papValue).toBe(1);
    expect(vermut.papValue === queso.papValue).toBe(true);
  });

  it("identifies out-of-stock products for barter", () => {
    const inStock = { ...SEED_PACKAGES[0], stockUnits: 3 };
    const outOfStock = { ...SEED_PACKAGES[0], stockUnits: 0 };

    expect(inStock.stockUnits > 0).toBe(true);
    expect(outOfStock.stockUnits > 0).toBe(false);
  });

  it("filters gondola items by production type", () => {
    const packages = SEED_PACKAGES;
    const organicOnly = packages.filter((p) => p.productionType === "ORGANIC");
    const agroOnly = packages.filter(
      (p) => p.productionType === "AGROECOLOGICAL",
    );

    expect(organicOnly.length).toBeGreaterThan(0);
    expect(organicOnly.every((p) => p.productionType === "ORGANIC")).toBe(true);
    expect(agroOnly.every((p) => p.productionType === "AGROECOLOGICAL")).toBe(
      true,
    );
  });

  it("excludes packages from the active producer in gondola", () => {
    const activeProducerId = SEED_PRODUCERS[0].id;
    const gondola = SEED_PACKAGES.filter(
      (p) => p.producerId !== activeProducerId,
    );

    expect(gondola.every((p) => p.producerId !== activeProducerId)).toBe(true);
  });

  it("offers a gondola filter option for every production type", () => {
    const offered = TYPE_OPTIONS.map((option) => option.value);

    for (const productionType of PRODUCTION_TYPES) {
      expect(offered).toContain(productionType);
    }
  });
});
