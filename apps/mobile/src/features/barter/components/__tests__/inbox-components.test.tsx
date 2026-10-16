import { describe, expect, it } from "bun:test";
import type { ProductPackage, TradeMatch } from "@myself/shared";
import { SEED_PACKAGES, SEED_PRODUCERS } from "../../barter-store";
import {
  getCounterOfferCandidates,
  getMatchActionAvailability,
  getTradeRole,
} from "../../inbox-utils";

const [vermut, queso, miel] = SEED_PRODUCERS;

function buildMatch(overrides: Partial<TradeMatch>): TradeMatch {
  return {
    id: "match-test",
    requesterId: vermut.id,
    targetProducerId: queso.id,
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
    expect(getTradeRole(match, queso.id)).toBe("target");
  });

  it("resolves the active producer as requester of an outgoing match", () => {
    const match = buildMatch({});
    expect(getTradeRole(match, vermut.id)).toBe("requester");
  });

  it("returns null when the active producer is not a party", () => {
    const match = buildMatch({});
    expect(getTradeRole(match, miel.id)).toBeNull();
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

  it("returns empty when the requester has no alternative packages", () => {
    const match = buildMatch({ requesterId: miel.id });
    const packages = SEED_PACKAGES.filter((p) => p.id !== "pkg-miel-1kg");
    const candidates = getCounterOfferCandidates(packages, match);

    expect(candidates).toEqual([]);
  });
});
