import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  createBarterStore,
  PRODUCER_IDS,
  SEED_PACKAGES,
  type BarterStore,
} from "../barter-store";
import {
  getMatchActionAvailability,
  getCounterOfferCandidates,
} from "../inbox-utils";

const VERMUT = PRODUCER_IDS.VERMUT;
const QUESO = PRODUCER_IDS.QUESO;
const ROSSO = "direct-vermut-rosso-750";
const BLANCO = "direct-vermut-blanco-750";
const QUESO_A = "cat-2";
const QUESO_B = "cat-3";

// Cart tests must be hermetic: another test file may stub globalThis
// window/localStorage while these run (bun test interleaves files under
// --randomize, and CI seeds reorder too), and a stubbed localStorage would
// carry reservations across stores. Non-web mode never persists.
const savedGlobals = new Map<string, unknown>();

beforeEach(() => {
  for (const key of ["window", "localStorage", "BroadcastChannel"]) {
    savedGlobals.set(key, (globalThis as Record<string, unknown>)[key]);
  }
  (globalThis as Record<string, unknown>).window = undefined;
  (globalThis as Record<string, unknown>).localStorage = undefined;
  (globalThis as Record<string, unknown>).BroadcastChannel = undefined;
});

afterEach(() => {
  for (const [key, value] of savedGlobals) {
    (globalThis as Record<string, unknown>)[key] = value;
  }
  savedGlobals.clear();
});

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

describe("PR #163 review fixes", () => {
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

  it("persists the previous total on each counter (rule 8 re-check shows the delta)", () => {
    const match = store.createTradeProposal({
      requesterId: VERMUT,
      targetProducerId: QUESO,
      offeredLines: [{ packageId: ROSSO, units: 3 }],
      targetLines: [{ packageId: QUESO_A, units: 3 }],
    });
    const countered = store.counterOfferTradeMatch({
      matchId: match.id,
      producerId: QUESO,
      offeredLines: [{ packageId: ROSSO, units: 2 }],
      targetLines: [{ packageId: QUESO_A, units: 2 }],
    });
    expect(countered.totalPap).toBe(2);
    expect(countered.counterOfferHistory?.previousTotalPap).toBe(3);
  });
});

describe("PR #163 negotiation-turn and candidates fixes", () => {
  const VERMUT = PRODUCER_IDS.VERMUT;
  const QUESO = PRODUCER_IDS.QUESO;
  const ROSSO = "direct-vermut-rosso-750";
  const QUESO_A = "cat-2";

  it("tracks whose turn it is: round parity decides who answers (rule 8)", () => {
    // Even round (0, 2, …): the proposal was made by the requester, so the
    // target answers. Odd round: the target made the counter, the requester
    // answers. The action selector must follow the round, not the status.
    const pending = getMatchActionAvailability(
      "COUNTER_OFFERED",
      "target",
      true,
      0,
    );
    expect(pending.canAccept).toBe(true);
    const pendingReq = getMatchActionAvailability(
      "COUNTER_OFFERED",
      "requester",
      true,
      0,
    );
    expect(pendingReq.canAccept).toBe(false);

    const afterTargetCounter = getMatchActionAvailability(
      "COUNTER_OFFERED",
      "requester",
      true,
      1,
    );
    expect(afterTargetCounter.canAccept).toBe(true);
    const targetWaits = getMatchActionAvailability(
      "COUNTER_OFFERED",
      "target",
      true,
      1,
    );
    expect(targetWaits.canAccept).toBe(false);
  });

  it("counter candidates: 1-PAP packages qualify regardless of the trade total", () => {
    const packages = [
      { id: "a", producerId: VERMUT, papValue: 1, stockUnits: 3, title: "A" },
      { id: "b", producerId: VERMUT, papValue: 1, stockUnits: 2, title: "B" },
    ] as unknown as Parameters<typeof getCounterOfferCandidates>[0];
    const match = {
      requesterId: VERMUT,
      offeredLines: [{ packageId: "a", units: 3 }],
      totalPap: 3,
    };
    const candidates = getCounterOfferCandidates(packages, match);
    // Both 1-PAP packages qualify for a multi-PAP trade; the currently
    // offered one is excluded unless it is the only choice (quantity-only
    // counter must stay possible).
    expect(candidates.map((p) => p.id)).toContain("b");
  });
});
