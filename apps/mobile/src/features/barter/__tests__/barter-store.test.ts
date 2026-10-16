import { describe, expect, it, beforeEach } from "bun:test";
import {
  createBarterStore,
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
      defaultActiveProducerId: SEED_PRODUCERS[0].id, // Vermut Sabadao
      broadcastEnabled: false, // Isolated in unit tests
    });
  });

  it("initializes with default seed state and active producer", () => {
    const state = store.getState();
    expect(state.producers.length).toBeGreaterThanOrEqual(2);
    expect(state.packages.length).toBeGreaterThanOrEqual(3);
    expect(state.activeProducerId).toBe("prod-vermut");
  });

  it("calculates geographical distance accurately with Haversine formula", () => {
    // Mendoza (Vermut) to Santa Fe (Naturaleza Viva) ~ 750-850 km
    const vermut = SEED_PRODUCERS[0];
    const queso = SEED_PRODUCERS[1];
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
      requesterId: "prod-vermut",
      targetProducerId: "prod-queso",
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
      requesterId: "prod-vermut",
      targetProducerId: "prod-queso",
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
      requesterId: "prod-vermut",
      targetProducerId: "prod-queso",
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });

    // Producer C also proposes match 2 for Queso Gouda
    const match2 = store.createTradeProposal({
      requesterId: "prod-miel",
      targetProducerId: "prod-queso",
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
      requesterId: "prod-vermut",
      targetProducerId: "prod-queso",
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });

    // Target producer counters proposing miel instead of vermut
    const countered = store.counterOfferTradeMatch({
      matchId: match.id,
      targetProducerId: "prod-queso",
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
      requesterId: "prod-vermut",
      targetProducerId: "prod-queso",
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });
    store.acceptTradeMatch(match.id);

    // Requester confirms
    const step1 = store.confirmDelivery(match.id, "prod-vermut");
    expect(step1.status).toBe("WAITING_DELIVERY");
    expect(step1.deliveryConfirmation.confirmedByRequester).toBe(true);
    expect(step1.deliveryConfirmation.confirmedByTarget).toBe(false);

    // Target confirms
    const step2 = store.confirmDelivery(match.id, "prod-queso");
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
      requesterId: "prod-vermut",
      targetProducerId: "prod-queso",
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });

    store.acceptTradeMatch(match.id);

    // One producer cancels while in WAITING_DELIVERY
    const cancelled = store.cancelTradeMatch(match.id, "prod-vermut");
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
