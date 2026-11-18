import { beforeEach, describe, expect, it } from "bun:test";
import {
  createBarterStore,
  PRODUCER_IDS,
  SEED_PACKAGES,
  type BarterStore,
} from "../barter-store";

const VERMUT = PRODUCER_IDS.VERMUT;
const QUESO = PRODUCER_IDS.QUESO;
const ROSSO = "direct-vermut-rosso-750";
const BLANCO = "direct-vermut-blanco-750";
const QUESO_A = "cat-2";
const QUESO_B = "cat-3";

describe("createTradeProposal with carts (issue #162)", () => {
  let store: BarterStore;

  beforeEach(() => {
    store = createBarterStore({ broadcastEnabled: false });
    // The seed ships stock 1 per package; the scenarios need real inventories.
    store.updatePackageStock(ROSSO, 5);
    store.updatePackageStock(BLANCO, 5);
    store.updatePackageStock(QUESO_A, 5);
    store.updatePackageStock(QUESO_B, 5);
  });

  it("accepts a 1:1 trade as one line per side with units 1 (regression)", () => {
    const match = store.createTradeProposal({
      requesterId: VERMUT,
      targetProducerId: QUESO,
      offeredLines: [{ packageId: ROSSO, units: 1 }],
      targetLines: [{ packageId: QUESO_A, units: 1 }],
    });
    expect(match.totalPap).toBe(1);
    expect(match.round).toBe(0);
    expect(match.status).toBe("PENDING");
  });

  it("accepts a mixed balanced cart (3 PAP ↔ 3 PAP)", () => {
    const match = store.createTradeProposal({
      requesterId: VERMUT,
      targetProducerId: QUESO,
      offeredLines: [
        { packageId: ROSSO, units: 2 },
        { packageId: BLANCO, units: 1 },
      ],
      targetLines: [
        { packageId: QUESO_A, units: 2 },
        { packageId: QUESO_B, units: 1 },
      ],
    });
    expect(match.totalPap).toBe(3);
  });

  it("rejects an unbalanced cart with the exact symmetry message", () => {
    expect(() =>
      store.createTradeProposal({
        requesterId: VERMUT,
        targetProducerId: QUESO,
        offeredLines: [{ packageId: ROSSO, units: 3 }],
        targetLines: [{ packageId: QUESO_A, units: 2 }],
      }),
    ).toThrow("Los dos lados deben sumar la misma cantidad de PAP");
  });

  it("rejects a line whose units exceed the package's available stock, naming it", () => {
    expect(() =>
      store.createTradeProposal({
        requesterId: VERMUT,
        targetProducerId: QUESO,
        offeredLines: [{ packageId: ROSSO, units: 6 }],
        targetLines: [{ packageId: QUESO_A, units: 6 }],
      }),
    ).toThrow(new RegExp(`units 6`));
  });

  it("accounts for open reservations: stock minus reserved blocks the excess", () => {
    // First proposal reserves the whole stock of the target package.
    store.createTradeProposal({
      requesterId: VERMUT,
      targetProducerId: QUESO,
      offeredLines: [{ packageId: ROSSO, units: 5 }],
      targetLines: [{ packageId: QUESO_A, units: 5 }],
    });
    // A second proposal asking one unit more than what is left is refused.
    expect(() =>
      store.createTradeProposal({
        requesterId: VERMUT,
        targetProducerId: QUESO,
        offeredLines: [{ packageId: ROSSO, units: 1 }],
        targetLines: [{ packageId: QUESO_A, units: 1 }],
      }),
    ).toThrow(/available/i);
  });

  it("rejects an offered package that does not belong to the requester", () => {
    expect(() =>
      store.createTradeProposal({
        requesterId: VERMUT,
        targetProducerId: QUESO,
        offeredLines: [{ packageId: QUESO_A, units: 1 }],
        targetLines: [{ packageId: QUESO_A, units: 1 }],
      }),
    ).toThrow("Offered package must belong to the requesting producer");
  });

  it("rejects an unknown package id", () => {
    expect(() =>
      store.createTradeProposal({
        requesterId: VERMUT,
        targetProducerId: QUESO,
        offeredLines: [{ packageId: ROSSO, units: 1 }],
        targetLines: [{ packageId: "does-not-exist", units: 1 }],
      }),
    ).toThrow();
  });
});

describe("counter-offer negotiation (issue #162 rules 7-9)", () => {
  let store: BarterStore;
  const VERMUT = PRODUCER_IDS.VERMUT;
  const QUESO = PRODUCER_IDS.QUESO;
  const ROSSO = "direct-vermut-rosso-750";
  const BLANCO = "direct-vermut-blanco-750";
  const QUESO_A = "cat-2";
  const QUESO_B = "cat-3";

  beforeEach(() => {
    store = createBarterStore({ broadcastEnabled: false });
    for (const id of [ROSSO, BLANCO, QUESO_A, QUESO_B]) {
      store.updatePackageStock(id, 10);
    }
  });

  function propose(offeredUnits: number, targetUnits: number) {
    return store.createTradeProposal({
      requesterId: VERMUT,
      targetProducerId: QUESO,
      offeredLines: [{ packageId: ROSSO, units: offeredUnits }],
      targetLines: [{ packageId: QUESO_A, units: targetUnits }],
    });
  }

  it("lets the requester counter-offer too (rule 8: re-check returns to the other side)", () => {
    const match = propose(3, 3);
    const countered = store.counterOfferTradeMatch({
      matchId: match.id,
      producerId: VERMUT,
      offeredLines: [{ packageId: ROSSO, units: 2 }],
      targetLines: [{ packageId: QUESO_A, units: 2 }],
    });
    expect(countered.round).toBe(1);
    expect(countered.totalPap).toBe(2);
  });

  it("accepts a lower counter-offer (2 ↔ 2 against 3 ↔ 3) and moves the total", () => {
    const match = propose(3, 3);
    const countered = store.counterOfferTradeMatch({
      matchId: match.id,
      producerId: QUESO,
      offeredLines: [{ packageId: ROSSO, units: 2 }],
      targetLines: [{ packageId: QUESO_A, units: 2 }],
    });
    expect(countered.totalPap).toBe(2);
    expect(countered.round).toBe(1);
    expect(countered.status).toBe("COUNTER_OFFERED");
  });

  it("accepts a higher counter-offer (4 ↔ 4) while stock holds both sides", () => {
    const match = propose(3, 3);
    const countered = store.counterOfferTradeMatch({
      matchId: match.id,
      producerId: QUESO,
      offeredLines: [{ packageId: ROSSO, units: 4 }],
      targetLines: [{ packageId: QUESO_A, units: 4 }],
    });
    expect(countered.totalPap).toBe(4);
  });

  it("rejects a higher counter-offer when the stock cannot cover it", () => {
    store.updatePackageStock(QUESO_A, 3);
    const match = propose(3, 3);
    expect(() =>
      store.counterOfferTradeMatch({
        matchId: match.id,
        producerId: QUESO,
        offeredLines: [{ packageId: ROSSO, units: 4 }],
        targetLines: [{ packageId: QUESO_A, units: 4 }],
      }),
    ).toThrow(/available 3/);
  });

  it("rejects an asymmetric counter-offer with the symmetry message", () => {
    const match = propose(3, 3);
    expect(() =>
      store.counterOfferTradeMatch({
        matchId: match.id,
        producerId: QUESO,
        offeredLines: [{ packageId: ROSSO, units: 2 }],
        targetLines: [{ packageId: QUESO_A, units: 3 }],
      }),
    ).toThrow("Los dos lados deben sumar la misma cantidad de PAP");
  });

  it("keeps the current target side when the counter does not replace it and balances", () => {
    const match = propose(3, 3);
    const countered = store.counterOfferTradeMatch({
      matchId: match.id,
      producerId: QUESO,
      offeredLines: [{ packageId: ROSSO, units: 3 }],
    });
    expect(countered.targetLines).toEqual(match.targetLines);
    expect(countered.totalPap).toBe(3);
  });

  it("stops counter-offers at the round limit (rule 9)", () => {
    const match = propose(1, 1);
    let current = match;
    // Alternate sides for MAX_COUNTER_ROUNDS rounds.
    for (let i = 0; i < 50; i++) {
      current = store.counterOfferTradeMatch({
        matchId: match.id,
        producerId: i % 2 === 0 ? QUESO : VERMUT,
        offeredLines: [{ packageId: ROSSO, units: 1 }],
        targetLines: [{ packageId: QUESO_A, units: 1 }],
      });
    }
    expect(current.round).toBe(50);
    expect(() =>
      store.counterOfferTradeMatch({
        matchId: match.id,
        producerId: VERMUT,
        offeredLines: [{ packageId: ROSSO, units: 1 }],
        targetLines: [{ packageId: QUESO_A, units: 1 }],
      }),
    ).toThrow(/round limit reached \(50\)/);
  });

  it("releases the previous round's reservation when the counter replaces a cart (rule 11)", () => {
    // Stock exactly 3: the 3↔3 proposal reserves all of it.
    store.updatePackageStock(ROSSO, 3);
    store.updatePackageStock(QUESO_A, 3);
    const match = propose(3, 3);

    // The counter to 2↔2 releases the 3-unit reservation: a new proposal for
    // 2 units fits, because only one reservation per match is active.
    const countered = store.counterOfferTradeMatch({
      matchId: match.id,
      producerId: QUESO,
      offeredLines: [{ packageId: ROSSO, units: 2 }],
      targetLines: [{ packageId: QUESO_A, units: 2 }],
    });
    expect(countered.totalPap).toBe(2);

    const second = store.createTradeProposal({
      requesterId: VERMUT,
      targetProducerId: QUESO,
      offeredLines: [{ packageId: BLANCO, units: 2 }],
      targetLines: [{ packageId: QUESO_B, units: 2 }],
    });
    expect(second.totalPap).toBe(2);
  });
});
