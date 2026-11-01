import { describe, expect, it, beforeEach } from "bun:test";
import {
  buildProducerLink,
  createBarterStore,
  migratePersistedState,
  migrateProducerId,
  PRODUCER_IDS,
  resolveProducerId,
  SEED_PRODUCERS,
  SEED_PACKAGES,
} from "../barter-store";
import { calculateDistanceKm } from "../geo-utils";

describe("Barter Store & Concurrency Engine", () => {
  let store: ReturnType<typeof createBarterStore>;

  beforeEach(() => {
    store = createBarterStore({
      initialProducers: SEED_PRODUCERS,
      initialPackages: SEED_PACKAGES,
      initialMatches: [],
      defaultActiveProducerId: PRODUCER_IDS.VERMUT, // Vermut Sabado
      broadcastEnabled: false, // Isolated in unit tests
    });
  });

  it("initializes with default seed state and active producer", () => {
    const state = store.getState();
    expect(state.producers.length).toBeGreaterThanOrEqual(2);
    expect(state.packages.length).toBeGreaterThanOrEqual(3);
    expect(state.activeProducerId).toBe("sabado");
  });

  it("keeps every seeded package pointing at a seeded producer", () => {
    const state = store.getState();
    const producerIds = state.producers.map((producer) => producer.id);

    // use-barter.ts resolves this link with a non-null assertion, so a package
    // naming an unknown producer would crash the gondola at render time.
    for (const pkg of state.packages) {
      expect(producerIds).toContain(pkg.producerId);
    }
  });

  it("calculates geographical distance accurately with Haversine formula", () => {
    // Vermut Sabado (Umepay, Calamuchita) to Naturaleza Viva (Guadalupe Norte)
    // is ~900 km: both producers are selected by id, because the seed list is
    // the printed catalog and its order is the catalog's, not this test's.
    const vermut = SEED_PRODUCERS.find(
      (producer) => producer.id === PRODUCER_IDS.VERMUT,
    );
    const queso = SEED_PRODUCERS.find(
      (producer) => producer.id === PRODUCER_IDS.QUESO,
    );

    if (!vermut || !queso) {
      throw new Error("The seeded producers this test measures were not found");
    }
    const distanceKm = calculateDistanceKm(
      vermut.latitude,
      vermut.longitude,
      queso.latitude,
      queso.longitude,
    );
    expect(distanceKm).toBeGreaterThan(600);
    expect(distanceKm).toBeLessThan(1000);
  });

  it("creates a trade proposal in PENDING status without locking stock", () => {
    const initialPkgVermut = store
      .getState()
      .packages.find((p) => p.id === "pkg-vermut-pack4")!;
    const initialStock = initialPkgVermut.stockUnits;

    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
      papConfigArs: 50000,
      ttlHours: 48,
    });

    expect(match.status).toBe("PENDING");
    expect(match.totalPap).toBe(1);

    // Stock MUST NOT be deducted in PENDING
    const afterPkgVermut = store
      .getState()
      .packages.find((p) => p.id === "pkg-vermut-pack4")!;
    expect(afterPkgVermut.stockUnits).toBe(initialStock);
  });

  it("accepts a trade match, deducts stock for both producers, and enters WAITING_DELIVERY", () => {
    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });

    const vermutStockBefore = store
      .getState()
      .packages.find((p) => p.id === "pkg-vermut-pack4")!.stockUnits;
    const quesoStockBefore = store
      .getState()
      .packages.find((p) => p.id === "pkg-queso-gouda")!.stockUnits;

    const updatedMatch = store.acceptTradeMatch(match.id);
    expect(updatedMatch.status).toBe("WAITING_DELIVERY");

    const vermutStockAfter = store
      .getState()
      .packages.find((p) => p.id === "pkg-vermut-pack4")!.stockUnits;
    const quesoStockAfter = store
      .getState()
      .packages.find((p) => p.id === "pkg-queso-gouda")!.stockUnits;

    expect(vermutStockAfter).toBe(vermutStockBefore - 1);
    expect(quesoStockAfter).toBe(quesoStockBefore - 1);
  });

  it("cascades cancellation (CANCELLED_INSUFFICIENT_STOCK) to other pending matches when stock runs out", () => {
    // Set stock of queso to exactly 1
    store.updatePackageStock("pkg-queso-gouda", 1);

    // Producer A proposes match 1 for Queso Gouda
    const match1 = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });

    // Producer C also proposes match 2 for Queso Gouda
    const match2 = store.createTradeProposal({
      requesterId: PRODUCER_IDS.MIEL,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-miel-1kg",
      targetPackageId: "pkg-queso-gouda",
    });

    // Accept match 1 -> consumes the only 1 unit of stock
    store.acceptTradeMatch(match1.id);

    const matches = store.getState().matches;
    const resolvedMatch1 = matches.find((m) => m.id === match1.id)!;
    const resolvedMatch2 = matches.find((m) => m.id === match2.id)!;

    expect(resolvedMatch1.status).toBe("WAITING_DELIVERY");
    expect(resolvedMatch2.status).toBe("CANCELLED_INSUFFICIENT_STOCK");
  });

  it("handles single-round counter-offer and transfers turn to requester", () => {
    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });

    // Target producer counters proposing miel instead of vermut
    const countered = store.counterOfferTradeMatch({
      matchId: match.id,
      targetProducerId: PRODUCER_IDS.QUESO,
      counterOfferedPackageId: "pkg-vermut-miel",
    });

    expect(countered.status).toBe("COUNTER_OFFERED");
    expect(countered.offeredPackageId).toBe("pkg-vermut-miel");
    expect(countered.counterOfferHistory?.previousOfferedPackageId).toBe(
      "pkg-vermut-pack4",
    );

    // Requester accepts the counter-offer
    const accepted = store.acceptTradeMatch(match.id);
    expect(accepted.status).toBe("WAITING_DELIVERY");

    // Stock of honey should be decremented, not vermut
    const mielStock = store
      .getState()
      .packages.find((p) => p.id === "pkg-vermut-miel")!.stockUnits;
    expect(mielStock).toBe(
      SEED_PACKAGES.find((p) => p.id === "pkg-vermut-miel")!.stockUnits - 1,
    );
  });

  it("completes trade only when both producers confirm delivery (double handshake)", () => {
    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });
    store.acceptTradeMatch(match.id);

    // Requester confirms
    const step1 = store.confirmDelivery(match.id, PRODUCER_IDS.VERMUT);
    expect(step1.status).toBe("WAITING_DELIVERY");
    expect(step1.deliveryConfirmation.confirmedByRequester).toBe(true);
    expect(step1.deliveryConfirmation.confirmedByTarget).toBe(false);

    // Target confirms
    const step2 = store.confirmDelivery(match.id, PRODUCER_IDS.QUESO);
    expect(step2.status).toBe("COMPLETED");
    expect(step2.deliveryConfirmation.confirmedByTarget).toBe(true);
  });

  it("rolls back stock when trade is cancelled prior to physical completion", () => {
    const vermutStockInitial = store
      .getState()
      .packages.find((p) => p.id === "pkg-vermut-pack4")!.stockUnits;
    const quesoStockInitial = store
      .getState()
      .packages.find((p) => p.id === "pkg-queso-gouda")!.stockUnits;

    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });

    store.acceptTradeMatch(match.id);

    // One producer cancels while in WAITING_DELIVERY
    const cancelled = store.cancelTradeMatch(match.id, PRODUCER_IDS.VERMUT);
    expect(cancelled.status).toBe("CANCELLED_BY_PRODUCER");

    // Stock must be restored to initial values
    const vermutStockRestored = store
      .getState()
      .packages.find((p) => p.id === "pkg-vermut-pack4")!.stockUnits;
    const quesoStockRestored = store
      .getState()
      .packages.find((p) => p.id === "pkg-queso-gouda")!.stockUnits;

    expect(vermutStockRestored).toBe(vermutStockInitial);
    expect(quesoStockRestored).toBe(quesoStockInitial);
  });
});

describe("Producer reference resolution (?producerId=)", () => {
  it("still resolves a producer id", () => {
    expect(resolveProducerId(SEED_PRODUCERS, "naturaleza-viva")).toBe(
      "naturaleza-viva",
    );
    expect(resolveProducerId(SEED_PRODUCERS, "sabado")).toBe("sabado");
  });

  it("resolves a producer display name, ignoring case and spacing", () => {
    expect(resolveProducerId(SEED_PRODUCERS, "Naturaleza Viva")).toBe(
      "naturaleza-viva",
    );
    expect(resolveProducerId(SEED_PRODUCERS, "  naturaleza   viva  ")).toBe(
      "naturaleza-viva",
    );
    expect(resolveProducerId(SEED_PRODUCERS, "vermut-sabado")).toBe("sabado");
    expect(resolveProducerId(SEED_PRODUCERS, "colmenas del sol")).toBe(
      "colmenas-del-sol",
    );
  });

  it("returns undefined when the reference matches no producer", () => {
    expect(resolveProducerId(SEED_PRODUCERS, "prod-quinoa")).toBeUndefined();
    expect(resolveProducerId(SEED_PRODUCERS, "")).toBeUndefined();
    expect(resolveProducerId(SEED_PRODUCERS, null)).toBeUndefined();
    expect(resolveProducerId(SEED_PRODUCERS, undefined)).toBeUndefined();
  });
});

describe("Producer simulation link (buildProducerLink)", () => {
  it("builds the link that opens the barter screen as a producer", () => {
    const link = buildProducerLink("https://app.test", PRODUCER_IDS.QUESO);

    expect(link).toBe("https://app.test/barter?producerId=naturaleza-viva");
  });

  it("encodes a reference that needs escaping", () => {
    const link = buildProducerLink("https://app.test", "Naturaleza Viva");

    expect(link).toBe("https://app.test/barter?producerId=Naturaleza%20Viva");
  });
});

describe("Renamed producer ids (migration)", () => {
  const store = createBarterStore({
    initialProducers: SEED_PRODUCERS,
    initialPackages: SEED_PACKAGES,
    initialMatches: [],
    broadcastEnabled: false,
  });

  it("translates a former producer id to its current value", () => {
    expect(migrateProducerId("prod-vermut")).toBe(PRODUCER_IDS.VERMUT);
    expect(migrateProducerId("prod-queso")).toBe(PRODUCER_IDS.QUESO);
    expect(migrateProducerId("prod-miel")).toBe("colmenas-del-sol");
  });

  it("leaves a current or unknown id untouched", () => {
    expect(migrateProducerId(PRODUCER_IDS.MIEL)).toBe(PRODUCER_IDS.MIEL);
    expect(migrateProducerId("prod-quinoa")).toBe("prod-quinoa");
  });

  it("rewrites the ids inside a state written by a previous build", () => {
    // Built through the store so the fixture follows the real match shape, then
    // given the producer ids the previous build wrote into its state.
    const legacyMatch = {
      ...store.createTradeProposal({
        requesterId: PRODUCER_IDS.VERMUT,
        targetProducerId: PRODUCER_IDS.QUESO,
        offeredPackageId: SEED_PACKAGES[0].id,
        targetPackageId: SEED_PACKAGES[2].id,
      }),
      requesterId: "prod-vermut",
      targetProducerId: "prod-queso",
    };

    const migrated = migratePersistedState({
      producers: [{ ...SEED_PRODUCERS[0], id: "prod-vermut" }],
      packages: [{ ...SEED_PACKAGES[2], producerId: "prod-queso" }],
      matches: [legacyMatch],
      papConfigArs: 1234,
    });

    expect(migrated.producers?.[0].id).toBe(PRODUCER_IDS.VERMUT);
    expect(migrated.packages?.[0].producerId).toBe(PRODUCER_IDS.QUESO);
    expect(migrated.matches?.[0].requesterId).toBe(PRODUCER_IDS.VERMUT);
    expect(migrated.matches?.[0].targetProducerId).toBe(PRODUCER_IDS.QUESO);
    // Slices the migration does not own survive untouched.
    expect(migrated.papConfigArs).toBe(1234);
  });

  it("leaves a state without packages or matches empty", () => {
    const migrated = migratePersistedState({});

    expect(migrated.packages).toBeUndefined();
    expect(migrated.matches).toBeUndefined();
  });

  it("still resolves the former id of a renamed producer", () => {
    expect(resolveProducerId(SEED_PRODUCERS, "prod-queso")).toBe(
      PRODUCER_IDS.QUESO,
    );
    expect(resolveProducerId(SEED_PRODUCERS, "prod-vermut")).toBe(
      PRODUCER_IDS.VERMUT,
    );
  });
});
