/**
 * Boundaries of the external-state granularity rule (issue #83, item 2) that
 * the existing `barter-external-state.test.ts` does not pin:
 *  - a *valid but empty* list (the store itself writes `matches: []` on every
 *    notify) must read as absent like any other zero-survivor slice;
 *  - `parseExternalState` returns null only when neither slice is a list, and
 *    only then is a broadcast dropped whole (never echoed);
 *  - a match that survives without its package fails loudly in the mutations
 *    that need a package, and a rejected command leaves the bytes untouched.
 */
import { afterEach, describe, expect, it } from "bun:test";
import type { TradeMatch } from "@myself/shared";
import {
  createBarterStore,
  PRODUCER_IDS,
  SEED_PACKAGES,
  SEED_PRODUCERS,
} from "../barter-store";

const STORAGE_KEY = "p2p_barter_poc_state_v1";
let mem: Map<string, string>;
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

afterEach(() => {
  for (const [key, value] of saved) {
    (globalThis as Record<string, unknown>)[key] = value;
  }
  saved.clear();
});

function stub() {
  for (const key of ["window", "localStorage", "BroadcastChannel"]) {
    saved.set(key, (globalThis as Record<string, unknown>)[key]);
  }
  mem = new Map();
  peers = [];
  (globalThis as Record<string, unknown>).window = { location: { search: "" } };
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => void mem.set(key, value),
    removeItem: (key: string) => void mem.delete(key),
    clear: () => void mem.clear(),
  };
  (globalThis as Record<string, unknown>).BroadcastChannel =
    FakeBroadcastChannel;
}

/** The last channel opened belongs to the store this helper just built. */
function boot(raw?: string, broadcastEnabled = false) {
  stub();
  if (raw !== undefined) mem.set(STORAGE_KEY, raw);
  const store = createBarterStore({
    initialProducers: SEED_PRODUCERS,
    broadcastEnabled,
  });
  return { store, peer: peers.at(-1)! };
}

const MATCH: TradeMatch = {
  id: "match-boundary",
  requesterId: PRODUCER_IDS.VERMUT,
  targetProducerId: PRODUCER_IDS.QUESO,
  offeredPackageId: "pkg-vermut-pack4",
  targetPackageId: "pkg-queso-gouda",
  papSnapshotArs: 50000,
  totalPap: 1,
  status: "WAITING_DELIVERY",
  deliveryConfirmation: {
    confirmedByRequester: false,
    confirmedByTarget: false,
  },
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("external state: empty lists and rejected commands", () => {
  it("keeps the local slices when the peer broadcasts valid but empty lists", () => {
    const { store, peer } = boot(undefined, true);

    peer.onmessage?.({
      data: {
        type: "BARTER_STATE_SYNC",
        payload: {
          packages: SEED_PACKAGES,
          matches: [MATCH],
          papConfigArs: 50000,
        },
      },
    });
    expect(store.getState().matches).toHaveLength(1);

    // A live tab with no matches writes `matches: []` on every notify; that is
    // a zero-survivor slice, so it must not empty the peer.
    peer.onmessage?.({
      data: {
        type: "BARTER_STATE_SYNC",
        payload: { packages: [], matches: [], papConfigArs: 50000 },
      },
    });

    expect(store.getState().matches).toHaveLength(1);
    expect(store.getState().packages).toEqual(SEED_PACKAGES);
  });

  it("reads an empty stored list as absent, so the catalog falls back to the seeds", () => {
    const { store } = boot(
      JSON.stringify({ packages: [], matches: [], papConfigArs: 50000 }),
    );

    expect(store.getState().packages).toEqual(SEED_PACKAGES);
    expect(store.getState().matches).toEqual([]);
  });

  it("drops a broadcast whole only when neither slice is a list", () => {
    const { store, peer } = boot(undefined, true);
    const packagesBefore = store.getState().packages;

    expect(() =>
      peer.onmessage?.({
        data: {
          type: "BARTER_STATE_SYNC",
          payload: { packages: 42, matches: "nope", papConfigArs: 999 },
        },
      }),
    ).not.toThrow();

    expect(store.getState().packages).toEqual(packagesBefore);
    expect(store.getState().papConfigArs).toBe(50000);
    expect(peer.posted).toHaveLength(0);
  });

  it("keeps an orphan match and fails loudly where a package is required", () => {
    const { store } = boot(
      JSON.stringify({
        packages: [{ ...SEED_PACKAGES[0], papValue: 0.5 }],
        matches: [
          {
            ...MATCH,
            status: "PENDING",
            offeredPackageId: "pkg-dropped",
            targetPackageId: "pkg-dropped",
          },
        ],
        papConfigArs: 50000,
      }),
    );
    expect(store.getState().matches).toHaveLength(1);
    expect(store.getState().packages).toEqual(SEED_PACKAGES);

    const bytesBefore = mem.get(STORAGE_KEY);
    expect(() => store.acceptTradeMatch(MATCH.id)).toThrow(
      "One or both trade packages missing from catalog",
    );
    expect(() =>
      store.createTradeProposal({
        requesterId: PRODUCER_IDS.VERMUT,
        targetProducerId: PRODUCER_IDS.QUESO,
        offeredPackageId: "pkg-ghost",
        targetPackageId: "pkg-ghost",
      }),
    ).toThrow("Specified product packages not found in catalog");

    expect(mem.get(STORAGE_KEY)).toBe(bytesBefore);
  });

  it("applies the readable half of a mixed payload without echoing it", () => {
    const { store, peer } = boot(undefined, true);
    const { deliveryConfirmation, ...incomplete } = MATCH;

    peer.onmessage?.({
      data: {
        type: "BARTER_STATE_SYNC",
        payload: {
          packages: [{ ...SEED_PACKAGES[0], id: "pkg-peer", stockUnits: 7 }],
          matches: [incomplete, MATCH],
          papConfigArs: 50000,
        },
      },
    });

    expect(store.getState().packages).toHaveLength(1);
    expect(store.getState().packages[0].id).toBe("pkg-peer");
    expect(store.getState().matches).toHaveLength(1);
    expect(store.getState().matches[0].id).toBe(MATCH.id);
    expect(peer.posted).toHaveLength(0);
  });
});
