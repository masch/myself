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
  filterPackagesByTitle,
  toggleProducerFilter,
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
    ).toContain("Vermut Rosso (muy bueno)");

    const found = filterGondolaPackages(gondola, "VERMUT ROSSO");

    expect(found.map((p) => p.title)).toContain("Vermut Rosso (muy bueno)");
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

/**
 * The chip is one control with two states, so pressing it again has to undo what
 * pressing it did instead of nesting filters nobody can see.
 */
describe("toggleProducerFilter", () => {
  it("sets the producer the first time and clears it when pressed again", () => {
    const filtered = toggleProducerFilter(undefined, "naturaleza-viva");

    expect(filtered).toBe("naturaleza-viva");
    expect(toggleProducerFilter(filtered, "naturaleza-viva")).toBeUndefined();
  });

  it("moves the filter to another producer instead of keeping both", () => {
    expect(toggleProducerFilter("naturaleza-viva", "sasaki")).toBe("sasaki");
  });
});

describe("filterPackagesByTitle", () => {
  const own = [
    { id: "a", title: "Pack 4 Botellas Vermut Rosso 750ml" },
    { id: "b", title: "Miel Multiflora de Chacra 1kg" },
    { id: "c", title: "Vermut Rosso x 750 ml (muy bueno)" },
  ];

  it("returns the whole inventory when nothing is typed", () => {
    expect(filterPackagesByTitle(own, "")).toEqual(own);
    expect(filterPackagesByTitle(own, "   ")).toEqual(own);
  });

  it("matches the title folding case and accents", () => {
    expect(filterPackagesByTitle(own, "VERMUT").map((p) => p.id)).toEqual([
      "a",
      "c",
    ]);
    expect(
      filterPackagesByTitle(own, "miel multiflora").map((p) => p.id),
    ).toEqual(["b"]);
  });

  it("returns nothing when no title matches", () => {
    expect(filterPackagesByTitle(own, "queso")).toEqual([]);
  });
});

/**
 * The producer filter is one chip per card narrowing one list, so it composes with
 * the filters already there and it never empties the gondola because the producer
 * it names stopped existing.
 */
describe("deriveGondolaPackages narrows to one producer", () => {
  it("keeps only that producer's packages, composed with the type filter", () => {
    const gondola = deriveGondolaPackages(
      makeState({
        activeProducerId: "sabado",
        producerFilterId: "naturaleza-viva",
      }),
    );

    expect(gondola.length).toBeGreaterThan(0);
    for (const item of gondola) {
      expect(item.producerId).toBe("naturaleza-viva");
    }

    // AND, never replace: Naturaleza Viva is organic, so asking for vegan on its
    // shelf is empty. An unfiltered producer list would still carry rows.
    expect(
      deriveGondolaPackages(
        makeState({
          activeProducerId: "sabado",
          producerFilterId: "naturaleza-viva",
          productionTypeFilter: "VEGAN",
        }),
      ),
    ).toEqual([]);
  });

  it("still applies the distance ceiling inside the narrowed list", () => {
    const narrow = deriveGondolaPackages(
      makeState({
        activeProducerId: "sabado",
        producerFilterId: "naturaleza-viva",
      }),
    );
    const near = deriveGondolaPackages(
      makeState({
        activeProducerId: "sabado",
        producerFilterId: "naturaleza-viva",
        maxDistanceKm: 50,
      }),
    );

    expect(narrow.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThan(narrow.length);
    for (const item of near) {
      expect(item.distanceKm).toBeLessThanOrEqual(50);
      expect(item.producerId).toBe("naturaleza-viva");
    }
  });

  it("narrows nothing when the filter names a producer the catalog lost", () => {
    // A link built by a newer build, or a stored state after a catalog change: an
    // empty gondola would read as "this producer sells nothing" instead of "this
    // filter no longer applies".
    const unfiltered = deriveGondolaPackages(makeState());
    const stale = deriveGondolaPackages(
      makeState({ producerFilterId: "prod-ghost" }),
    );

    expect(stale.map((item) => item.id)).toEqual(
      unfiltered.map((item) => item.id),
    );
  });
});
