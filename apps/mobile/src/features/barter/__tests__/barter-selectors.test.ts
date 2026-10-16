import { describe, expect, it } from "bun:test";
import { type ProductPackage } from "@myself/shared";
import {
  SEED_PACKAGES,
  SEED_PRODUCERS,
  type BarterState,
} from "../barter-store";
import { deriveGondolaPackages } from "../barter-selectors";

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
