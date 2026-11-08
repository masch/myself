import { describe, expect, it } from "bun:test";
import {
  DEFAULT_PAP_VALUE_ARS,
  productPackageSchema,
  type ProductPackage,
} from "@myself/shared";
import type { TradeMatch } from "@myself/shared";
import {
  createBarterStore,
  keepOnlyCatalogPackages,
  mergeCatalogPackages,
  mergePeerPackages,
  PRODUCER_IDS,
  SEED_PACKAGES,
  type BarterState,
} from "../barter-store";
import { catalogPackages } from "../catalog-packages";
import { FIXTURE_PACKAGES, fixturePackage } from "./fixture-packages";

/**
 * Pins what the store seeds and what a stored install receives: the seed is the
 * printed catalog and nothing else (S1), every seeded card carries the catalog
 * price and disclosure (S5), a state written before the catalog keeps only the
 * packages this build derives (S2), and a state persisted by an older build is
 * merged into the catalog instead of replacing it.
 */

/**
 * The four handwritten packages the app used to seed, rebuilt under their real
 * retired ids: they are what a stored install still carries.
 */
const RETIRED_PACKAGES: ProductPackage[] = [
  { ...fixturePackage("pkg-fixture-vermut-pack4"), id: "pkg-vermut-pack4" },
  { ...fixturePackage("pkg-fixture-vermut-miel"), id: "pkg-vermut-miel" },
  { ...fixturePackage("pkg-fixture-queso-gouda"), id: "pkg-queso-gouda" },
  {
    ...fixturePackage("pkg-fixture-queso-provoleta"),
    id: "pkg-queso-provoleta",
  },
];

/** The one seed package of a product, so a test never re-derives the math. */
function packageById(id: string): ProductPackage {
  const found = SEED_PACKAGES.find((pkg) => pkg.id === id);

  if (!found) {
    throw new Error(`The seeded packages carry no ${id}`);
  }

  return found;
}

/** A stored 1:1 trade, so the purge tests only state what they are about. */
function storedMatch(overrides: Partial<TradeMatch> = {}): TradeMatch {
  const now = new Date().toISOString();

  return {
    id: "match-1",
    requesterId: PRODUCER_IDS.VERMUT,
    targetProducerId: PRODUCER_IDS.QUESO,
    offeredPackageId: "cat-890",
    targetPackageId: "cat-5",
    papSnapshotArs: DEFAULT_PAP_VALUE_ARS,
    totalPap: 1,
    status: "PENDING",
    deliveryConfirmation: {
      confirmedByRequester: false,
      confirmedByTarget: false,
    },
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("SEED_PACKAGES", () => {
  it("seeds exactly the printed catalog, in printed order", () => {
    const catalog = catalogPackages();

    expect(SEED_PACKAGES.map((pkg) => pkg.id)).toEqual(
      catalog.map((pkg) => pkg.id),
    );
    expect(new Set(SEED_PACKAGES.map((pkg) => pkg.id)).size).toBe(
      catalog.length,
    );
  });

  it("seeds nothing the catalog does not derive", () => {
    const handwritten = SEED_PACKAGES.filter(
      (pkg) => !pkg.id.startsWith("cat-"),
    );

    expect(handwritten).toEqual([]);
  });

  it("gives every seeded package the catalog price and disclosure", () => {
    for (const pkg of SEED_PACKAGES) {
      expect(pkg.catalog).toBeDefined();
      expect(pkg.priceArs).toBe(pkg.papValue * DEFAULT_PAP_VALUE_ARS);
    }
  });

  it("keeps every package the shared contract accepts", () => {
    const rejected = SEED_PACKAGES.filter(
      (pkg) => !productPackageSchema.safeParse(pkg).success,
    );

    expect(rejected).toEqual([]);
  });
});

describe("keepOnlyCatalogPackages", () => {
  it("drops every package the catalog does not derive", () => {
    const state = keepOnlyCatalogPackages({
      packages: [packageById("cat-5"), ...RETIRED_PACKAGES],
    });

    expect(state.packages?.map((pkg) => pkg.id)).toEqual(["cat-5"]);
  });

  it("leaves a catalog-only state untouched", () => {
    const match = storedMatch();
    const state = keepOnlyCatalogPackages({
      packages: [packageById("cat-5"), packageById("cat-890")],
      matches: [match],
    });

    expect(state.packages?.map((pkg) => pkg.id)).toEqual(["cat-5", "cat-890"]);
    expect(state.matches).toEqual([match]);
  });

  it("moves a match onto the catalog package that carries the same product", () => {
    const match = storedMatch({
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });

    const state = keepOnlyCatalogPackages({ matches: [match] });

    expect(state.matches).toHaveLength(1);
    expect(state.matches?.[0]?.offeredPackageId).toBe("cat-890");
    expect(state.matches?.[0]?.targetPackageId).toBe("cat-5");
    expect(state.matches?.[0]?.id).toBe(match.id);
    expect(state.matches?.[0]?.status).toBe(match.status);
  });

  it("drops a match whose product the catalog does not print", () => {
    const state = keepOnlyCatalogPackages({
      matches: [
        storedMatch({ id: "match-miel", offeredPackageId: "pkg-vermut-miel" }),
        storedMatch({
          id: "match-provoleta",
          targetPackageId: "pkg-queso-provoleta",
        }),
      ],
    });

    expect(state.matches).toEqual([]);
  });

  it("moves the counter-offer history with the trade", () => {
    const match = storedMatch({
      status: "COUNTER_OFFERED",
      counterOfferHistory: {
        previousOfferedPackageId: "pkg-vermut-pack4",
        counterOfferedAt: new Date().toISOString(),
      },
    });

    const state = keepOnlyCatalogPackages({ matches: [match] });

    expect(
      state.matches?.[0]?.counterOfferHistory?.previousOfferedPackageId,
    ).toBe("cat-890");
  });

  it("drops a counter-offer history it cannot resolve, keeping the trade", () => {
    const match = storedMatch({
      status: "COUNTER_OFFERED",
      counterOfferHistory: {
        previousOfferedPackageId: "pkg-queso-provoleta",
        counterOfferedAt: new Date().toISOString(),
      },
    });

    const state = keepOnlyCatalogPackages({ matches: [match] });

    expect(state.matches).toHaveLength(1);
    expect(state.matches?.[0]?.counterOfferHistory).toBeUndefined();
  });

  it("reads a slice that is not a list as absent", () => {
    const state = keepOnlyCatalogPackages({
      packages: 42,
    } as unknown as Partial<BarterState>);

    expect(state.packages).toBeUndefined();
    expect(state.matches).toBeUndefined();
  });
});

describe("mergeCatalogPackages", () => {
  it("returns the seeded catalog when the state carries no packages", () => {
    expect(mergeCatalogPackages()).toEqual(SEED_PACKAGES);
    expect(mergeCatalogPackages([])).toEqual(SEED_PACKAGES);
  });

  it("keeps the whole catalog when the state carries the pre-catalog list", () => {
    const preCatalog =
      keepOnlyCatalogPackages({ packages: RETIRED_PACKAGES }).packages ?? [];
    const merged = mergeCatalogPackages(preCatalog);

    expect(preCatalog).toEqual([]);
    expect(merged.map((pkg) => pkg.id)).toEqual(
      catalogPackages().map((pkg) => pkg.id),
    );
  });

  it("never resurrects the seed stock of a package a stored trade consumed", () => {
    const consumed = { ...packageById("cat-5"), stockUnits: 0 };
    const foreign = {
      ...fixturePackage("pkg-fixture-vermut-miel"),
      id: "pkg-de-una-version-anterior",
    };

    const merged = mergeCatalogPackages([consumed, foreign]);
    const byId = new Map(merged.map((pkg) => [pkg.id, pkg]));

    // The stored package keeps the stock it carries, and a package this build
    // cannot derive is the purge's business, not the merge's: this function
    // appends what is missing and drops nothing.
    expect(byId.get("cat-5")?.stockUnits).toBe(0);
    expect(byId.get("pkg-de-una-version-anterior")).toEqual(foreign);
    expect(merged.filter((pkg) => pkg.id === "cat-5")).toHaveLength(1);
    expect(merged).toHaveLength(SEED_PACKAGES.length + 1);
  });

  it("appends the catalog after the stored packages, not before", () => {
    const stored = [{ ...packageById("cat-890"), stockUnits: 2 }];

    const merged = mergeCatalogPackages(stored);

    expect(merged[0]).toEqual(stored[0]);
    expect(merged.slice(1).map((pkg) => pkg.id)).toEqual(
      SEED_PACKAGES.map((pkg) => pkg.id).filter((id) => id !== "cat-890"),
    );
  });
});

describe("the seeded catalog trades 1:1", () => {
  it("proposes a catalog package against another producer's catalog package", () => {
    // A sibling test file can leave its fake web storage behind, so this store
    // pins the state it depends on instead of inheriting somebody else's.
    const store = createBarterStore({
      initialPackages: SEED_PACKAGES,
      initialMatches: [],
      broadcastEnabled: false,
    });
    store.setPapConfigArs(DEFAULT_PAP_VALUE_ARS);
    const onePap = SEED_PACKAGES.filter((pkg) => pkg.papValue === 1);
    const offered = onePap[0];
    const target = onePap.find((pkg) => pkg.producerId !== offered.producerId);

    if (!target) {
      throw new Error("The catalog carries no other producer's 1 PAP package");
    }

    const match = store.createTradeProposal({
      requesterId: offered.producerId,
      targetProducerId: target.producerId,
      offeredPackageId: offered.id,
      targetPackageId: target.id,
    });

    expect(match.status).toBe("PENDING");
    expect(match.totalPap).toBe(1);
    expect(match.offeredPackageId).toBe(offered.id);
    expect(match.targetPackageId).toBe(target.id);
    expect(store.getState().matches).toHaveLength(1);
  });
});

describe("the shared package contract", () => {
  it("accepts a package that discloses the printed catalog facts", () => {
    const parsed = productPackageSchema.safeParse(packageById("cat-5"));

    expect(parsed.success).toBe(true);
  });

  it("still accepts a package that predates the catalog block", () => {
    const pocPackage = fixturePackage("pkg-fixture-vermut-pack4");

    expect(pocPackage.catalog).toBeUndefined();
    expect(productPackageSchema.safeParse(pocPackage).success).toBe(true);
    expect(pocPackage.producerId).toBe(PRODUCER_IDS.VERMUT);
  });

  it("refuses a measure the catalog does not print", () => {
    const printed = packageById("cat-5");
    const parsed = productPackageSchema.safeParse({
      ...printed,
      catalog: { ...printed.catalog, measure: "litros" },
    });

    expect(parsed.success).toBe(false);
  });

  it("refuses a catalog block missing what the disclosure owes", () => {
    const printed = packageById("cat-5");
    const parsed = productPackageSchema.safeParse({
      ...printed,
      catalog: { ...printed.catalog, realPapValue: undefined },
    });

    expect(parsed.success).toBe(false);
  });
});

describe("mergePeerPackages", () => {
  it("keeps the catalog a peer tab written by an older bundle does not know", () => {
    // A tab on the pre-catalog bundle broadcasts the four retired packs only.
    const peer = RETIRED_PACKAGES;
    const merged = mergePeerPackages(SEED_PACKAGES, peer);

    expect(merged.map((pkg) => pkg.id)).toEqual(
      SEED_PACKAGES.map((pkg) => pkg.id),
    );
  });

  it("never resurrects a package this build cannot derive", () => {
    const merged = mergePeerPackages(SEED_PACKAGES, [
      ...SEED_PACKAGES,
      ...FIXTURE_PACKAGES,
    ]);

    expect(merged.filter((pkg) => pkg.id.startsWith("pkg-"))).toEqual([]);
    expect(merged).toHaveLength(SEED_PACKAGES.length);
  });

  it("keeps the stock this tab consumed for an id the peer does not carry", () => {
    const consumed = SEED_PACKAGES.map((pkg) =>
      pkg.id === "cat-5" ? { ...pkg, stockUnits: 0 } : pkg,
    );
    const merged = mergePeerPackages(consumed, RETIRED_PACKAGES);

    expect(merged.find((pkg) => pkg.id === "cat-5")?.stockUnits).toBe(0);
  });

  it("takes the peer's version of an id both tabs carry, keeping the local order", () => {
    const peer = SEED_PACKAGES.map((pkg) =>
      pkg.id === "cat-5" ? { ...pkg, stockUnits: 7 } : pkg,
    );
    const merged = mergePeerPackages(SEED_PACKAGES, peer);

    expect(merged.find((pkg) => pkg.id === "cat-5")?.stockUnits).toBe(7);
    expect(merged.map((pkg) => pkg.id)).toEqual(
      SEED_PACKAGES.map((pkg) => pkg.id),
    );
  });

  it("appends a catalog package the peer carries and this tab does not", () => {
    const local = SEED_PACKAGES.slice(0, -1);
    const merged = mergePeerPackages(local, SEED_PACKAGES);

    expect(merged).toHaveLength(SEED_PACKAGES.length);
    expect(merged.at(-1)?.id).toBe(SEED_PACKAGES.at(-1)?.id);
  });

  it("keeps the local list when the peer sends no packages", () => {
    expect(mergePeerPackages(SEED_PACKAGES, undefined)).toBe(SEED_PACKAGES);
  });
});
