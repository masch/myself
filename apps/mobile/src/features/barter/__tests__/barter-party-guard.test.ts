/**
 * The store's party guard, at its boundaries.
 *
 * `rejectTradeMatch` and `confirmDelivery` both refuse a producer that is not
 * one of the match's two parties. The store is deliberately party-only, which
 * is broader than the inbox's role/status matrix in `inbox-utils` — that one
 * only offers the action on the party's turn — so these pins fix which half of
 * the boundary belongs to the store and which to the UI.
 *
 * Rejection was the last command without the guard (issue #83, item 1), and
 * the ordering cases are what would catch it coming back: a foreign caller
 * still gets the same not-found, transition and expiry errors it got before.
 *
 * The store runs in its browser shape here (stubbed `window`, `localStorage`
 * and `BroadcastChannel`) so a refused command can be proven to write neither
 * bytes nor a message.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  createBarterStore,
  PRODUCER_IDS,
  SEED_PACKAGES,
  SEED_PRODUCERS,
} from "../barter-store";

/**
 * A producer the catalog prints but neither party of these matches, so "not a
 * party" is tested against a real producer instead of a dropped one.
 */
const OUTSIDER_ID = "granja-nova";

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

function propose(store: ReturnType<typeof createBarterStore>) {
  return store.createTradeProposal({
    requesterId: PRODUCER_IDS.VERMUT,
    targetProducerId: PRODUCER_IDS.QUESO,
    offeredPackageId: "pkg-vermut-pack4",
    targetPackageId: "pkg-queso-gouda",
  });
}

function counterOnce(
  store: ReturnType<typeof createBarterStore>,
  matchId: string,
) {
  store.counterOfferTradeMatch({
    matchId,
    targetProducerId: PRODUCER_IDS.QUESO,
    counterOfferedPackageId: "pkg-vermut-miel",
  });
}

function snapshot(
  store: ReturnType<typeof createBarterStore>,
  peer: FakeBroadcastChannel,
) {
  return {
    match: store.getState().matches[0],
    packages: store.getState().packages,
    storage: JSON.stringify([...storage.entries()].sort()),
    writes,
    broadcasts: peer.posted.length,
  };
}

describe("Barter store: the party guard boundaries", () => {
  it("refuses an unknown, a foreign or an empty producer id without writing", () => {
    for (const outsider of [OUTSIDER_ID, "ghost-producer", ""]) {
      const { store, peer } = seedStore();
      const match = propose(store);
      const before = snapshot(store, peer);

      expect(() => store.rejectTradeMatch(match.id, outsider)).toThrow(
        "Producer not party to this trade",
      );

      expect(snapshot(store, peer)).toEqual(before);
      expect(store.getState().matches[0].status).toBe("PENDING");
    }
  });

  it("keeps the recorded check order ahead of the party guard", () => {
    // The match is looked up first.
    const { store } = seedStore();
    expect(() => store.rejectTradeMatch("missing-match", "ghost")).toThrow(
      "Match missing-match not found",
    );

    // Then the transition, so a foreign caller sees what it saw before.
    const accepted = propose(store);
    store.acceptTradeMatch(accepted.id);
    expect(() => store.rejectTradeMatch(accepted.id, "ghost")).toThrow(
      "Invalid transition from WAITING_DELIVERY to REJECTED",
    );

    // Then the TTL: an expired proposal reports the expiry, not the actor.
    const expired = {
      ...propose(store),
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    };
    const expiredStore = createBarterStore({
      initialProducers: SEED_PRODUCERS,
      initialPackages: SEED_PACKAGES,
      initialMatches: [expired],
      broadcastEnabled: false,
    });
    expect(() => expiredStore.rejectTradeMatch(expired.id, "ghost")).toThrow(
      `Trade proposal expired at ${expired.expiresAt}`,
    );
    expect(expiredStore.getState().matches[0].status).toBe("PENDING");
  });

  it("lets either party reject, on a fresh and on a countered proposal", () => {
    // The requester rejects the proposal it sent.
    {
      const { store } = seedStore();
      const match = propose(store);
      expect(store.rejectTradeMatch(match.id, PRODUCER_IDS.VERMUT).status).toBe(
        "REJECTED",
      );
    }

    // The target rejects the one it received.
    {
      const { store } = seedStore();
      const match = propose(store);
      expect(store.rejectTradeMatch(match.id, PRODUCER_IDS.QUESO).status).toBe(
        "REJECTED",
      );
    }

    // A countered proposal is rejected the same way by a party...
    {
      const { store } = seedStore();
      const match = propose(store);
      counterOnce(store, match.id);
      expect(store.rejectTradeMatch(match.id, PRODUCER_IDS.VERMUT).status).toBe(
        "REJECTED",
      );
    }

    // ...and refused by a foreign producer, which writes nothing.
    {
      const { store, peer } = seedStore();
      const match = propose(store);
      counterOnce(store, match.id);
      const before = snapshot(store, peer);

      expect(() => store.rejectTradeMatch(match.id, OUTSIDER_ID)).toThrow(
        "Producer not party to this trade",
      );

      expect(snapshot(store, peer)).toEqual(before);
      expect(store.getState().matches[0].status).toBe("COUNTER_OFFERED");
    }
  });

  it("refuses a delivery confirmation from a producer that is not a party", () => {
    const { store, peer } = seedStore();
    const match = propose(store);
    store.acceptTradeMatch(match.id);
    const before = snapshot(store, peer);

    expect(() => store.confirmDelivery(match.id, OUTSIDER_ID)).toThrow(
      "Producer not party to this trade",
    );

    expect(snapshot(store, peer)).toEqual(before);
    expect(store.getState().matches[0].deliveryConfirmation).toEqual({
      confirmedByRequester: false,
      confirmedByTarget: false,
    });
    expect(store.getState().matches[0].status).toBe("WAITING_DELIVERY");
  });
});
