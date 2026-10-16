import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  createBarterStore,
  PRODUCER_IDS,
  SEED_PACKAGES,
} from "../barter-store";

/** The key the barter store persists its own state under. */
const STORAGE_KEY = "p2p_barter_poc_state_v1";

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

const legacyPackage = {
  id: "pkg-legacy",
  producerId: "prod-vermut",
  title: "Legacy",
  productionType: "AGROECOLOGICAL",
  priceArs: 50000,
  papValue: 1,
  stockUnits: 3,
};

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

describe("producer rename migration on the paths a user can reach", () => {
  it("migrates the payload of a tab still running the previous bundle", () => {
    const store = createBarterStore({});
    const peer = peers.at(-1)!;

    peer.onmessage?.({
      data: {
        type: "BARTER_STATE_SYNC",
        payload: {
          packages: [{ ...legacyPackage, producerId: "prod-queso" }],
          matches: [createMatch("m-peer", "prod-vermut", "prod-queso")],
          papConfigArs: 50000,
        },
      },
    });

    const state = store.getState();
    expect(state.packages[0].producerId).toBe(PRODUCER_IDS.QUESO);
    expect(state.matches[0].requesterId).toBe(PRODUCER_IDS.VERMUT);
    expect(state.matches[0].targetProducerId).toBe(PRODUCER_IDS.QUESO);
    // The translation is local: it is never echoed back to the peer.
    expect(peer.posted).toHaveLength(0);
  });

  it("resolves a link already handed out that still names the former id", () => {
    (globalThis as Record<string, unknown>).window = {
      location: { search: "?producerId=prod-queso" },
    };

    expect(createBarterStore({}).getState().activeProducerId).toBe(
      PRODUCER_IDS.QUESO,
    );
  });

  it("boots from the seeds when the stored value parses but is malformed", () => {
    storage.set(STORAGE_KEY, JSON.stringify({ packages: 42 }));

    const state = createBarterStore({ broadcastEnabled: false }).getState();

    expect(state.packages).toHaveLength(SEED_PACKAGES.length);
    expect(state.packages[0].producerId).toBe(PRODUCER_IDS.VERMUT);
  });

  it("leaves the stored bytes untouched when a command is rejected", () => {
    storage.set(
      STORAGE_KEY,
      JSON.stringify({
        packages: [legacyPackage],
        matches: [],
        papConfigArs: 1234,
      }),
    );
    const store = createBarterStore({ broadcastEnabled: false });
    const before = storage.get(STORAGE_KEY);
    writes = 0;

    expect(() => store.acceptTradeMatch("missing")).toThrow(
      "Match missing not found",
    );
    expect(() => store.confirmDelivery("missing", PRODUCER_IDS.VERMUT)).toThrow(
      "Match missing not found",
    );
    expect(() =>
      store.createTradeProposal({
        requesterId: PRODUCER_IDS.VERMUT,
        targetProducerId: PRODUCER_IDS.QUESO,
        offeredPackageId: "nope",
        targetPackageId: "nope",
      }),
    ).toThrow("Specified product packages not found in catalog");

    expect(writes).toBe(0);
    expect(storage.get(STORAGE_KEY)).toBe(before);
  });
});

describe("external payload validation", () => {
  it("drops a stored match that does not match the trade schema", () => {
    // Missing `deliveryConfirmation`: it used to load and then crash inside
    // confirmDelivery, which reads the confirmation of both parties.
    const malformed = {
      id: "match-malformed",
      requesterId: "prod-vermut",
      targetProducerId: "prod-queso",
      offeredPackageId: legacyPackage.id,
      targetPackageId: legacyPackage.id,
      papSnapshotArs: 50000,
      totalPap: 1,
      status: "WAITING_DELIVERY" as const,
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storage.set(
      STORAGE_KEY,
      JSON.stringify({
        packages: [legacyPackage],
        matches: [malformed],
        papConfigArs: 50000,
      }),
    );

    const store = createBarterStore({ broadcastEnabled: false });

    // Without the schema check this match loads and then crashes inside
    // confirmDelivery, which reads the confirmation of both parties.
    expect(() =>
      store.confirmDelivery("match-malformed", PRODUCER_IDS.VERMUT),
    ).toThrow("Match match-malformed not found");

    // The seed catalog replaces the stored slices, so the malformed match never
    // reaches the state at all.
    expect(store.getState().matches).toEqual([]);
    expect(store.getState().packages).toHaveLength(SEED_PACKAGES.length);
    expect(store.getState().packages[0].producerId).toBe(PRODUCER_IDS.VERMUT);
  });

  it("drops a broadcast payload that does not match the trade schema", () => {
    const store = createBarterStore({});
    const peer = peers.at(-1)!;
    const before = store.getState();

    peer.onmessage?.({
      data: {
        type: "BARTER_STATE_SYNC",
        payload: {
          packages: [{ ...legacyPackage, producerId: "prod-queso" }],
          matches: [
            {
              ...createMatch("match-malformed", "prod-vermut", "prod-queso"),
              deliveryConfirmation: undefined,
            },
          ],
          papConfigArs: 50000,
        },
      },
    });

    // The message is dropped before it reaches the state, and it is never
    // echoed back to the peer.
    expect(store.getState().packages).toEqual(before.packages);
    expect(store.getState().matches).toEqual(before.matches);
    expect(peer.posted).toHaveLength(0);
  });

  it("still loads a stored state whose packages and matches parse", () => {
    storage.set(
      STORAGE_KEY,
      JSON.stringify({
        packages: [legacyPackage],
        matches: [createMatch("m-stored", "prod-vermut", "prod-queso")],
        papConfigArs: 50000,
      }),
    );

    const state = createBarterStore({ broadcastEnabled: false }).getState();

    expect(state.packages).toHaveLength(1);
    expect(state.packages[0].producerId).toBe(PRODUCER_IDS.VERMUT);
    expect(state.matches).toHaveLength(1);
    expect(state.matches[0].id).toBe("m-stored");
  });
});

function createMatch(
  id: string,
  requesterId: string,
  targetProducerId: string,
) {
  return {
    id,
    requesterId,
    targetProducerId,
    offeredPackageId: legacyPackage.id,
    targetPackageId: legacyPackage.id,
    papSnapshotArs: 50000,
    totalPap: 1,
    status: "PENDING" as const,
    deliveryConfirmation: {
      confirmedByRequester: false,
      confirmedByTarget: false,
    },
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
