import { describe, expect, it } from "bun:test";
import type { ProductPackage, TradeMatch } from "@myself/shared";
import { SEED_PACKAGES, SEED_PRODUCERS } from "../../barter-store";
import {
  countCompletedTrades,
  countMatchesAwaitingReply,
  getCounterOfferCandidates,
  getMatchActionAvailability,
  getTradeRole,
} from "../../inbox-utils";

const [requester, target, outsider] = SEED_PRODUCERS;

function buildMatch(overrides: Partial<TradeMatch>): TradeMatch {
  return {
    id: "match-test",
    requesterId: requester.id,
    targetProducerId: target.id,
    offeredPackageId: "pkg-vermut-pack4",
    targetPackageId: "pkg-queso-gouda",
    papSnapshotArs: 50000,
    totalPap: 1,
    status: "PENDING",
    deliveryConfirmation: {
      confirmedByRequester: false,
      confirmedByTarget: false,
    },
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Barter Inbox: role resolution", () => {
  it("resolves the active producer as target of an incoming match", () => {
    const match = buildMatch({});
    expect(getTradeRole(match, target.id)).toBe("target");
  });

  it("resolves the active producer as requester of an outgoing match", () => {
    const match = buildMatch({});
    expect(getTradeRole(match, requester.id)).toBe("requester");
  });

  it("returns null when the active producer is not a party", () => {
    const match = buildMatch({});
    expect(getTradeRole(match, outsider.id)).toBeNull();
  });
});

describe("Barter Inbox: action availability", () => {
  it("target of a PENDING match can accept, reject, or counter-offer", () => {
    const actions = getMatchActionAvailability("PENDING", "target");
    expect(actions.canAccept).toBe(true);
    expect(actions.canReject).toBe(true);
    expect(actions.canCounterOffer).toBe(true);
    expect(actions.awaitingResponseFrom).toBeNull();
  });

  it("requester of a PENDING match only waits for the target", () => {
    const actions = getMatchActionAvailability("PENDING", "requester");
    expect(actions.canAccept).toBe(false);
    expect(actions.canReject).toBe(false);
    expect(actions.canCounterOffer).toBe(false);
    expect(actions.awaitingResponseFrom).toBe("target");
  });

  it("requester of a COUNTER_OFFERED match can accept or reject but NOT re-counter (single round)", () => {
    const actions = getMatchActionAvailability("COUNTER_OFFERED", "requester");
    expect(actions.canAccept).toBe(true);
    expect(actions.canReject).toBe(true);
    expect(actions.canCounterOffer).toBe(false);
    expect(actions.awaitingResponseFrom).toBeNull();
  });

  it("target of a COUNTER_OFFERED match waits for the requester decision", () => {
    const actions = getMatchActionAvailability("COUNTER_OFFERED", "target");
    expect(actions.canAccept).toBe(false);
    expect(actions.canReject).toBe(false);
    expect(actions.canCounterOffer).toBe(false);
    expect(actions.awaitingResponseFrom).toBe("requester");
  });

  it("offers no proposal actions once the trade is WAITING_DELIVERY", () => {
    for (const role of ["requester", "target"] as const) {
      const actions = getMatchActionAvailability("WAITING_DELIVERY", role);
      expect(actions.canAccept).toBe(false);
      expect(actions.canReject).toBe(false);
      expect(actions.canCounterOffer).toBe(false);
      expect(actions.awaitingResponseFrom).toBeNull();
    }
  });

  it("offers no actions on terminal statuses", () => {
    const terminals = [
      "COMPLETED",
      "REJECTED",
      "EXPIRED",
      "CANCELLED_INSUFFICIENT_STOCK",
      "CANCELLED_BY_PRODUCER",
    ] as const;
    for (const status of terminals) {
      for (const role of ["requester", "target"] as const) {
        const actions = getMatchActionAvailability(status, role);
        expect(actions.canAccept).toBe(false);
        expect(actions.canReject).toBe(false);
        expect(actions.canCounterOffer).toBe(false);
      }
    }
  });
});

describe("Barter Inbox: counter-offer candidates", () => {
  it("offers only alternative packages from the requester catalog", () => {
    const match = buildMatch({});
    const candidates = getCounterOfferCandidates(SEED_PACKAGES, match);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((p) => p.producerId === match.requesterId)).toBe(
      true,
    );
  });

  it("excludes the package currently offered in the match", () => {
    const match = buildMatch({ offeredPackageId: "pkg-vermut-pack4" });
    const candidates = getCounterOfferCandidates(SEED_PACKAGES, match);

    expect(candidates.some((p) => p.id === match.offeredPackageId)).toBe(false);
  });

  it("excludes out-of-stock packages", () => {
    const packages: ProductPackage[] = SEED_PACKAGES.map((p) =>
      p.id === "pkg-vermut-miel" ? { ...p, stockUnits: 0 } : p,
    );
    const match = buildMatch({});
    const candidates = getCounterOfferCandidates(packages, match);

    expect(candidates.some((p) => p.id === "pkg-vermut-miel")).toBe(false);
  });

  it("returns empty when the requester ships no alternative packages", () => {
    // Most of the 158 printed producers ship no package in this seed, so a
    // counter-offer has nothing to offer.
    const match = buildMatch({ requesterId: outsider.id });
    const candidates = getCounterOfferCandidates(SEED_PACKAGES, match);

    expect(candidates).toEqual([]);
  });
});

describe("Barter inbox: who still has to answer", () => {
  it("counts a pending proposal for its target and not for its requester", () => {
    const counts = countMatchesAwaitingReply([buildMatch({})]);

    expect(counts[target.id]).toBe(1);
    expect(counts[requester.id]).toBeUndefined();
  });

  it("counts a counter-offer for the requester who has to answer it", () => {
    const counts = countMatchesAwaitingReply([
      buildMatch({ status: "COUNTER_OFFERED" }),
    ]);

    expect(counts[requester.id]).toBe(1);
    expect(counts[target.id]).toBeUndefined();
  });

  it("adds both directions for the same producer", () => {
    const counts = countMatchesAwaitingReply([
      buildMatch({ id: "m-1" }),
      buildMatch({ id: "m-2", status: "COUNTER_OFFERED" }),
      buildMatch({ id: "m-3" }),
    ]);

    expect(counts[target.id]).toBe(2);
    expect(counts[requester.id]).toBe(1);
  });

  it("counts nothing once a match leaves the answerable statuses", () => {
    // Agreed, delivered, or dead: nobody owes an answer in any of these.
    for (const status of [
      "ACCEPTED",
      "WAITING_DELIVERY",
      "COMPLETED",
      "REJECTED",
      "EXPIRED",
      "CANCELLED_INSUFFICIENT_STOCK",
      "CANCELLED_BY_PRODUCER",
    ] as const) {
      expect(countMatchesAwaitingReply([buildMatch({ status })])).toEqual({});
    }
  });

  it("never counts a producer that is not a party to the match", () => {
    const counts = countMatchesAwaitingReply([buildMatch({})]);

    expect(counts[outsider.id]).toBeUndefined();
    expect(Object.keys(counts)).toHaveLength(1);
  });
});

describe("Barter inbox: completed trades per producer", () => {
  it("counts a completed trade for both parties", () => {
    const counts = countCompletedTrades([buildMatch({ status: "COMPLETED" })]);

    expect(counts[requester.id]).toBe(1);
    expect(counts[target.id]).toBe(1);
  });

  it("adds up every completed trade a producer was part of", () => {
    const counts = countCompletedTrades([
      buildMatch({ id: "m-1", status: "COMPLETED" }),
      buildMatch({ id: "m-2", status: "COMPLETED" }),
      buildMatch({ id: "m-3", status: "COMPLETED" }),
    ]);

    expect(counts[requester.id]).toBe(3);
    expect(counts[target.id]).toBe(3);
  });

  it("does not count a trade that has not been delivered and confirmed", () => {
    // Agreed or waiting for delivery can still fall apart: only COMPLETED is a
    // trade that happened.
    for (const status of [
      "PENDING",
      "COUNTER_OFFERED",
      "ACCEPTED",
      "WAITING_DELIVERY",
      "REJECTED",
      "EXPIRED",
      "CANCELLED_INSUFFICIENT_STOCK",
      "CANCELLED_BY_PRODUCER",
    ] as const) {
      expect(countCompletedTrades([buildMatch({ status })])).toEqual({});
    }
  });

  it("never counts a producer that is not a party to the trade", () => {
    const counts = countCompletedTrades([buildMatch({ status: "COMPLETED" })]);

    expect(counts[outsider.id]).toBeUndefined();
  });
});
