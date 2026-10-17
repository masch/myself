import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { ProductPackage, TradeMatch } from "@myself/shared";
import {
  createBarterStore,
  PRODUCER_IDS,
  SEED_PACKAGES,
  SEED_PRODUCERS,
} from "../barter-store";
import { getCounterOfferCandidates } from "../inbox-utils";

/**
 * Review-hardening guards for the barter store: actor/ownership, the 1:1 PAP
 * rule and the TTL on the transition itself.
 *
 * The store runs in its browser shape here (stubbed `window`, `localStorage`
 * and `BroadcastChannel`) so a refused command can be proven to write nothing:
 * no state, no persisted bytes, no broadcast.
 */

let storage: Map<string, string>;
let writes: number;
let peers: FakeBroadcastChannel[];
const saved = new Map<string, unknown>();

class FakeBroadcastChannel {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  posted: unknown[] = [];
  constructor(public name: string) {
    peers.push(this);
  }
  postMessage(message: unknown) {
    this.posted.push(message);
  }
  close() {}
}

beforeEach(() => {
  storage = new Map();
  writes = 0;
  peers = [];
  for (const key of ["window", "localStorage", "BroadcastChannel"]) {
    saved.set(key, (globalThis as Record<string, unknown>)[key]);
  }
  (globalThis as Record<string, unknown>).window = { location: { search: "" } };
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
      writes += 1;
    },
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  (globalThis as Record<string, unknown>).BroadcastChannel =
    FakeBroadcastChannel;
});

afterEach(() => {
  for (const [key, value] of saved) {
    (globalThis as Record<string, unknown>)[key] = value;
  }
});

function seedStore() {
  const store = createBarterStore({
    initialProducers: SEED_PRODUCERS,
    initialPackages: SEED_PACKAGES,
    initialMatches: [],
  });
  const peer = peers.at(-1)!;
  return { store, peer };
}

function stockOf(
  store: ReturnType<typeof createBarterStore>,
  packageId: string,
): number {
  return store.getState().packages.find((pkg) => pkg.id === packageId)!
    .stockUnits;
}

/** A 2 PAP package owned by the same producer as `SEED_PACKAGES[0]`. */
const TWO_PAP_PACKAGE: ProductPackage = {
  ...SEED_PACKAGES[0],
  id: "pkg-vermut-2pap",
  title: "Pack 8 Botellas Vermut Rosso 750ml",
  priceArs: 100000,
  papValue: 2,
};

function buildMatch(overrides: Partial<TradeMatch> = {}): TradeMatch {
  return {
    id: "match-hardening",
    requesterId: PRODUCER_IDS.VERMUT,
    targetProducerId: PRODUCER_IDS.QUESO,
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

describe("Barter store: actor & ownership guards", () => {
  it("rejects a proposal whose offered package belongs to another producer", () => {
    const { store, peer } = seedStore();
    writes = 0;

    expect(() =>
      store.createTradeProposal({
        requesterId: PRODUCER_IDS.VERMUT,
        targetProducerId: PRODUCER_IDS.QUESO,
        offeredPackageId: "pkg-queso-gouda",
        targetPackageId: "pkg-queso-provoleta",
      }),
    ).toThrow("Offered package must belong to the requesting producer");

    expect(store.getState().matches).toEqual([]);
    expect(store.getState().packages).toEqual(SEED_PACKAGES);
    expect(writes).toBe(0);
    expect(peer.posted).toHaveLength(0);
  });

  it("rejects a proposal whose target package belongs to another producer", () => {
    const { store, peer } = seedStore();
    writes = 0;

    expect(() =>
      store.createTradeProposal({
        requesterId: PRODUCER_IDS.VERMUT,
        targetProducerId: PRODUCER_IDS.QUESO,
        offeredPackageId: "pkg-vermut-pack4",
        targetPackageId: "pkg-miel-1kg",
      }),
    ).toThrow("Target package must belong to the target producer");

    expect(store.getState().matches).toEqual([]);
    expect(writes).toBe(0);
    expect(peer.posted).toHaveLength(0);
  });

  it("rejects a proposal a producer makes to itself", () => {
    const { store, peer } = seedStore();
    writes = 0;

    expect(() =>
      store.createTradeProposal({
        requesterId: PRODUCER_IDS.VERMUT,
        targetProducerId: PRODUCER_IDS.VERMUT,
        offeredPackageId: "pkg-vermut-pack4",
        targetPackageId: "pkg-vermut-miel",
      }),
    ).toThrow("A producer cannot trade with itself");

    expect(store.getState().matches).toEqual([]);
    expect(writes).toBe(0);
    expect(peer.posted).toHaveLength(0);
  });

  it("rejects a counter-offer from a producer that is not the match's target", () => {
    const { store, peer } = seedStore();
    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });
    writes = 0;
    const broadcastsBefore = peer.posted.length;

    expect(() =>
      store.counterOfferTradeMatch({
        matchId: match.id,
        targetProducerId: PRODUCER_IDS.MIEL,
        counterOfferedPackageId: "pkg-vermut-miel",
      }),
    ).toThrow("Only the target producer of a trade can counter-offer");

    expect(store.getState().matches[0]).toEqual(match);
    expect(writes).toBe(0);
    expect(peer.posted.length).toBe(broadcastsBefore);
  });

  it("rejects a counter-offer that swaps in a package from the target's own catalog", () => {
    const { store, peer } = seedStore();
    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });
    writes = 0;
    const broadcastsBefore = peer.posted.length;

    expect(() =>
      store.counterOfferTradeMatch({
        matchId: match.id,
        targetProducerId: PRODUCER_IDS.QUESO,
        counterOfferedPackageId: "pkg-queso-provoleta",
      }),
    ).toThrow("Counter-offered package must belong to the requester");

    expect(store.getState().matches[0]).toEqual(match);
    expect(writes).toBe(0);
    expect(peer.posted.length).toBe(broadcastsBefore);
  });

  it("rejects a cancellation from a producer that is not party to the trade", () => {
    const { store, peer } = seedStore();
    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });
    store.acceptTradeMatch(match.id);
    const accepted = store.getState().matches[0];
    const stockAfterAccept = store
      .getState()
      .packages.map((pkg) => pkg.stockUnits);
    writes = 0;
    const broadcastsBefore = peer.posted.length;

    expect(() => store.cancelTradeMatch(match.id, PRODUCER_IDS.MIEL)).toThrow(
      "Producer not party to this trade",
    );

    expect(store.getState().matches[0]).toEqual(accepted);
    expect(store.getState().packages.map((pkg) => pkg.stockUnits)).toEqual(
      stockAfterAccept,
    );
    expect(stockOf(store, "pkg-vermut-pack4")).toBe(
      SEED_PACKAGES[0].stockUnits - 1,
    );
    expect(writes).toBe(0);
    expect(peer.posted.length).toBe(broadcastsBefore);
  });

  it("rejects a rejection from a producer that is not party to the trade", () => {
    const { store, peer } = seedStore();
    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });
    const pending = store.getState().matches[0];
    writes = 0;
    const broadcastsBefore = peer.posted.length;

    expect(() => store.rejectTradeMatch(match.id, PRODUCER_IDS.MIEL)).toThrow(
      "Producer not party to this trade",
    );

    expect(store.getState().matches[0]).toEqual(pending);
    expect(store.getState().packages).toEqual(SEED_PACKAGES);
    expect(writes).toBe(0);
    expect(peer.posted.length).toBe(broadcastsBefore);
  });

  it("still lets either party reject a pending proposal", () => {
    const { store } = seedStore();

    // The requester rejects the proposal it sent...
    const asRequester = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });
    // ...and the target rejects the one it received. The store guard is
    // party-only: it is broader than the inbox's role/status matrix in
    // `inbox-utils`, which only offers the action on the party's turn, so the
    // fix must not narrow rejection to a single side.
    const asTarget = store.createTradeProposal({
      requesterId: PRODUCER_IDS.QUESO,
      targetProducerId: PRODUCER_IDS.VERMUT,
      offeredPackageId: "pkg-queso-gouda",
      targetPackageId: "pkg-vermut-pack4",
    });

    expect(
      store.rejectTradeMatch(asRequester.id, PRODUCER_IDS.VERMUT).status,
    ).toBe("REJECTED");
    expect(
      store.rejectTradeMatch(asTarget.id, PRODUCER_IDS.VERMUT).status,
    ).toBe("REJECTED");
  });
});

describe("Barter store: the 1:1 PAP rule", () => {
  it("rejects a proposal whose two packages have different PAP values", () => {
    const store = createBarterStore({
      initialProducers: SEED_PRODUCERS,
      initialPackages: [...SEED_PACKAGES, TWO_PAP_PACKAGE],
      broadcastEnabled: false,
    });
    writes = 0;

    expect(() =>
      store.createTradeProposal({
        requesterId: PRODUCER_IDS.VERMUT,
        targetProducerId: PRODUCER_IDS.QUESO,
        offeredPackageId: TWO_PAP_PACKAGE.id,
        targetPackageId: "pkg-queso-gouda",
      }),
    ).toThrow(
      "Trade packages must have the same PAP value: offered 2 PAP, target 1 PAP",
    );

    expect(store.getState().matches).toEqual([]);
    expect(writes).toBe(0);
  });

  it("rejects a counter-offer whose package has a different PAP value than the trade", () => {
    const store = createBarterStore({
      initialProducers: SEED_PRODUCERS,
      initialPackages: [...SEED_PACKAGES, TWO_PAP_PACKAGE],
      broadcastEnabled: false,
    });
    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });
    writes = 0;

    expect(() =>
      store.counterOfferTradeMatch({
        matchId: match.id,
        targetProducerId: PRODUCER_IDS.QUESO,
        counterOfferedPackageId: TWO_PAP_PACKAGE.id,
      }),
    ).toThrow(
      "Counter-offered package must have the same PAP value as the trade: 2 PAP vs 1 PAP",
    );

    expect(store.getState().matches[0]).toEqual(match);
    expect(writes).toBe(0);
  });
});

describe("Barter store: TTL on the transition", () => {
  function expiredStore() {
    const expired = buildMatch({
      id: "match-expired",
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const store = createBarterStore({
      initialProducers: SEED_PRODUCERS,
      initialPackages: SEED_PACKAGES,
      initialMatches: [expired],
      broadcastEnabled: false,
    });
    return { store, expired };
  }

  it("refuses every pre-completion command on a proposal whose TTL elapsed", () => {
    const { store, expired } = expiredStore();
    writes = 0;
    const message = `Trade proposal expired at ${expired.expiresAt}`;

    expect(() => store.acceptTradeMatch(expired.id)).toThrow(message);
    expect(() =>
      store.counterOfferTradeMatch({
        matchId: expired.id,
        targetProducerId: PRODUCER_IDS.QUESO,
        counterOfferedPackageId: "pkg-vermut-miel",
      }),
    ).toThrow(message);
    expect(() =>
      store.rejectTradeMatch(expired.id, PRODUCER_IDS.VERMUT),
    ).toThrow(message);

    expect(store.getState().matches[0]).toEqual(expired);
    expect(store.getState().packages).toEqual(SEED_PACKAGES);
    expect(writes).toBe(0);
  });
});

describe("Barter store: existing behaviour preserved", () => {
  it("still accepts a fresh proposal and lets a party cancel it with a stock rollback", () => {
    const { store, peer } = seedStore();
    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });

    const accepted = store.acceptTradeMatch(match.id);
    expect(accepted.status).toBe("WAITING_DELIVERY");
    expect(stockOf(store, "pkg-vermut-pack4")).toBe(
      SEED_PACKAGES[0].stockUnits - 1,
    );

    const cancelled = store.cancelTradeMatch(match.id, PRODUCER_IDS.QUESO);
    expect(cancelled.status).toBe("CANCELLED_BY_PRODUCER");
    expect(stockOf(store, "pkg-vermut-pack4")).toBe(
      SEED_PACKAGES[0].stockUnits,
    );
    expect(writes).toBeGreaterThan(0);
    expect(peer.posted.length).toBeGreaterThan(0);
  });

  it("still counters with a package from the requester's own catalog", () => {
    const { store } = seedStore();
    const match = store.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });

    const countered = store.counterOfferTradeMatch({
      matchId: match.id,
      targetProducerId: PRODUCER_IDS.QUESO,
      counterOfferedPackageId: "pkg-vermut-miel",
    });

    expect(countered.status).toBe("COUNTER_OFFERED");
    expect(countered.offeredPackageId).toBe("pkg-vermut-miel");
  });
});

describe("Counter-offer candidates: only 1:1 PAP options are offered", () => {
  it("excludes a requester package whose PAP value differs from the trade", () => {
    const packages: ProductPackage[] = [...SEED_PACKAGES, TWO_PAP_PACKAGE];
    const match: Pick<
      TradeMatch,
      "requesterId" | "offeredPackageId" | "totalPap"
    > = {
      requesterId: PRODUCER_IDS.VERMUT,
      offeredPackageId: "pkg-vermut-pack4",
      totalPap: 1,
    };

    const candidates = getCounterOfferCandidates(packages, match);

    expect(candidates.map((pkg) => pkg.id)).toContain("pkg-vermut-miel");
    expect(candidates.some((pkg) => pkg.id === TWO_PAP_PACKAGE.id)).toBe(false);
    expect(candidates.every((pkg) => pkg.papValue === match.totalPap)).toBe(
      true,
    );
  });
});
