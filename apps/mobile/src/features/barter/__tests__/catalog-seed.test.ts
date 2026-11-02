import { describe, expect, it } from "bun:test";
import {
  DEFAULT_PAP_VALUE_ARS,
  productPackageSchema,
  type ProductPackage,
} from "@myself/shared";
import {
  PRODUCER_IDS,
  SEED_PACKAGES,
  createBarterStore,
  mergeCatalogPackages,
  mergePeerPackages,
} from "../barter-store";
import { catalogPackages } from "../catalog-packages";

/**
 * Pins what the store seeds and what a stored install receives: the four POC
 * packages stay (they are a persisted contract, S8), the printed catalog is
 * appended once per product with the documented default stock (S7), and a state
 * persisted by an older build is merged into the catalog instead of replacing it
 * (S9).
 */

const POC_PACKAGE_IDS = [
  "pkg-vermut-pack4",
  "pkg-vermut-miel",
  "pkg-queso-gouda",
  "pkg-queso-provoleta",
];

/** The one seed package of a product, so a test never re-derives the math. */
function packageById(id: string): ProductPackage {
  const found = SEED_PACKAGES.find((pkg) => pkg.id === id);

  if (!found) {
    throw new Error(`The seeded packages carry no ${id}`);
  }

  return found;
}

describe("SEED_PACKAGES", () => {
  it("keeps the four POC packages first and appends the printed catalog", () => {
    expect(SEED_PACKAGES).toHaveLength(1531);
    expect(SEED_PACKAGES.slice(0, 4).map((pkg) => pkg.id)).toEqual(
      POC_PACKAGE_IDS,
    );
    expect(SEED_PACKAGES.slice(4).map((pkg) => pkg.id)).toEqual(
      catalogPackages().map((pkg) => pkg.id),
    );
    expect(new Set(SEED_PACKAGES.map((pkg) => pkg.id)).size).toBe(1531);
  });

  it("keeps every package the shared contract accepts", () => {
    const rejected = SEED_PACKAGES.filter(
      (pkg) => !productPackageSchema.safeParse(pkg).success,
    );

    expect(rejected).toEqual([]);
  });
});

describe("mergeCatalogPackages", () => {
  it("returns the seeded catalog when the state carries no packages", () => {
    expect(mergeCatalogPackages()).toEqual(SEED_PACKAGES);
    expect(mergeCatalogPackages([])).toEqual(SEED_PACKAGES);
  });

  it("keeps the whole catalog when the state carries the pre-catalog list", () => {
    const preCatalog = POC_PACKAGE_IDS.map(packageById);

    const merged = mergeCatalogPackages(preCatalog);

    expect(merged).toHaveLength(1531);
    expect(new Set(merged.map((pkg) => pkg.id)).size).toBe(1531);
    expect(merged.slice(0, 4)).toEqual(preCatalog);
    expect(merged.slice(4).map((pkg) => pkg.id)).toEqual(
      catalogPackages().map((pkg) => pkg.id),
    );
  });

  it("never resurrects the seed stock of a package a stored trade consumed", () => {
    const consumed = { ...packageById("cat-5"), stockUnits: 0 };
    const retired = {
      ...packageById("pkg-vermut-miel"),
      id: "pkg-de-una-version-anterior",
    };

    const merged = mergeCatalogPackages([consumed, retired]);
    const byId = new Map(merged.map((pkg) => [pkg.id, pkg]));

    // The stored package keeps the stock it carries, and the package the
    // catalog does not print survives because a match may point at it.
    expect(byId.get("cat-5")?.stockUnits).toBe(0);
    expect(byId.get("pkg-de-una-version-anterior")).toEqual(retired);
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
    const onePap = SEED_PACKAGES.filter(
      (pkg) => pkg.id.startsWith("cat-") && pkg.papValue === 1,
    );
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
    const pocPackage = packageById(POC_PACKAGE_IDS[0]);

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
  const catalogIds = SEED_PACKAGES.filter((pkg) => pkg.id.startsWith("cat-"));

  it("keeps the catalog a peer tab written by an older bundle does not know", () => {
    // A tab on the pre-catalog bundle broadcasts the four POC packs only.
    const peer = SEED_PACKAGES.filter((pkg) => !pkg.id.startsWith("cat-"));
    const merged = mergePeerPackages(SEED_PACKAGES, peer);

    expect(merged).toHaveLength(SEED_PACKAGES.length);
    expect(merged.filter((pkg) => pkg.id.startsWith("cat-"))).toHaveLength(
      catalogIds.length,
    );
  });

  it("keeps the stock this tab consumed for an id the peer does not carry", () => {
    const consumed = SEED_PACKAGES.map((pkg) =>
      pkg.id === "cat-5" ? { ...pkg, stockUnits: 0 } : pkg,
    );
    const peer = SEED_PACKAGES.filter((pkg) => !pkg.id.startsWith("cat-"));
    const merged = mergePeerPackages(consumed, peer);

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

  it("appends a package only the peer carries", () => {
    const foreign: ProductPackage = {
      ...SEED_PACKAGES[0]!,
      id: "pkg-del-otro-tab",
    };
    const merged = mergePeerPackages(SEED_PACKAGES, [
      ...SEED_PACKAGES,
      foreign,
    ]);

    expect(merged).toHaveLength(SEED_PACKAGES.length + 1);
    expect(merged.at(-1)?.id).toBe("pkg-del-otro-tab");
  });

  it("keeps the local list when the peer sends no packages", () => {
    expect(mergePeerPackages(SEED_PACKAGES, undefined)).toBe(SEED_PACKAGES);
  });
});
