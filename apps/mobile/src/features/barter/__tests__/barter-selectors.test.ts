import { describe, expect, it } from "bun:test";
import { type ProductPackage } from "@myself/shared";
import {
  SEED_PACKAGES,
  SEED_PRODUCERS,
  type BarterState,
} from "../barter-store";
import {
  deriveGondolaPackages,
  filterGondolaPackages,
} from "../barter-selectors";

function makeState(overrides: Partial<BarterState> = {}): BarterState {
  return {
    producers: SEED_PRODUCERS,
    packages: SEED_PACKAGES,
    matches: [],
    activeProducerId: SEED_PRODUCERS[0].id,
    papConfigArs: 50000,
    maxDistanceKm: undefined,
    productionTypeFilter: "ALL",
    ...overrides,
  };
}

describe("deriveGondolaPackages", () => {
  it("returns only packages from other producers, with their producer resolved", () => {
    const gondola = deriveGondolaPackages(makeState());

    expect(gondola.length).toBeGreaterThan(0);

    for (const item of gondola) {
      expect(item.producerId).not.toBe(SEED_PRODUCERS[0].id);
      expect(item.producer.id).toBe(item.producerId);
      expect(typeof item.distanceKm).toBe("number");
    }
  });

  it("skips a package whose producer is unknown instead of crashing", () => {
    // A hydrated localStorage state or a cross-tab broadcast can carry packages
    // seeded by a build that no longer exists. Rendering one of those used to
    // throw on `producer.latitude` and take the whole screen down.
    const orphan: ProductPackage = {
      ...SEED_PACKAGES[0],
      id: "pkg-orphan",
      producerId: "prod-ghost",
    };

    const gondola = deriveGondolaPackages(
      makeState({ packages: [...SEED_PACKAGES, orphan] }),
    );

    expect(gondola.map((item) => item.id)).not.toContain("pkg-orphan");
    expect(gondola.length).toBeGreaterThan(0);
  });
});

/**
 * The gondola holds 1531 packages, so the search field is the only way to reach
 * one product. The rule it applies lives in `filterGondolaPackages` and is
 * pinned here without rendering anything.
 */
describe("filterGondolaPackages", () => {
  // Vermut Sabado owns the catalog's vermut rows, so operating as another
  // producer is what puts them on the gondola at all.
  const gondola = deriveGondolaPackages(
    makeState({ activeProducerId: "naturaleza-viva" }),
  );

  it("returns every package, in gondola order, when the query is empty", () => {
    expect(filterGondolaPackages(gondola, "").map((p) => p.id)).toEqual(
      gondola.map((p) => p.id),
    );
    // A whitespace-only query is still no query.
    expect(filterGondolaPackages(gondola, "   ")).toHaveLength(gondola.length);
  });

  it("matches a product title, case-insensitively", () => {
    // The query the user reaches for first, and the row it has to find.
    expect(
      filterGondolaPackages(gondola, "vermut").map((p) => p.title),
    ).toContain("Vermut Rosso x 750 ml (muy bueno)");

    const found = filterGondolaPackages(gondola, "VERMUT ROSSO");

    expect(found.map((p) => p.title)).toContain(
      "Vermut Rosso x 750 ml (muy bueno)",
    );
    for (const item of found) {
      expect(item.title.toLowerCase()).toContain("vermut rosso");
    }
  });

  it("matches a producer name typed without its accents", () => {
    // Nobody types the tilde into a search box: the catalog is full of "Doña",
    // "Quillén" and "Chascomús", so the match folds accents on both sides.
    const found = filterGondolaPackages(gondola, "dona mecha");

    expect(found.length).toBeGreaterThan(0);
    for (const item of found) {
      expect(item.producer.name).toBe("Doña Mecha");
    }
  });

  it("finds nothing when neither the product nor the producer matches", () => {
    expect(filterGondolaPackages(gondola, "producto inexistente")).toEqual([]);
  });

  it("narrows the list the production-type and distance filters already built", () => {
    const narrow = deriveGondolaPackages(
      makeState({
        activeProducerId: "sabado",
        productionTypeFilter: "ORGANIC",
        maxDistanceKm: 250,
      }),
    );
    const found = filterGondolaPackages(narrow, "aceite de oliva");

    expect(found.length).toBeGreaterThan(0);
    for (const item of found) {
      expect(item.title.toLowerCase()).toContain("aceite de oliva");
      expect(item.productionType).toBe("ORGANIC");
      expect(item.distanceKm).toBeLessThanOrEqual(250);
    }

    // The unfiltered gondola carries rows the type and distance filters rule out,
    // which is what shows the search composes with them instead of replacing them.
    const elsewhere = filterGondolaPackages(
      deriveGondolaPackages(makeState({ activeProducerId: "sabado" })),
      "aceite de oliva",
    );
    expect(elsewhere.length).toBeGreaterThan(found.length);
  });
});
