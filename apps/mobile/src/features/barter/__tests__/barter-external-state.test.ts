/**
 * Granularity of the external state: what survives when only part of it is bad.
 *
 * Bytes in `localStorage` and broadcast messages are written by another build,
 * another tab, or a user with devtools open, and a single unusable entry used to
 * take the whole payload with it: one malformed match discarded every valid
 * package and reset the producer to the seed catalog (issue #83, item 2).
 *
 * The rule these tests pin: an unusable entry is dropped on its own, a slice
 * that is not a list at all is treated as absent, and only a payload where
 * nothing at all is readable falls back to the seeds.
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

/** Boots from a stored value; `broadcastEnabled` off keeps a load test quiet. */
function boot(raw?: string, broadcastEnabled = false) {
  stub();
  if (raw !== undefined) mem.set(STORAGE_KEY, raw);
  const store = createBarterStore({
    initialProducers: SEED_PRODUCERS,
    broadcastEnabled,
  });
  // The store only opens the channel when broadcasting is on, so this is set
  // for the cases that use it.
  const peer = peers.at(-1)!;
  return { store, peer };
}

/** Seed packages carrying a marker, so "loaded" and "fell back to seeds" differ. */
const MARKED = SEED_PACKAGES.map((pkg) => ({ ...pkg, stockUnits: 2 }));

function stockOf(
  store: ReturnType<typeof createBarterStore>,
  packageId: string,
): number | undefined {
  return store.getState().packages.find((pkg) => pkg.id === packageId)
    ?.stockUnits;
}

const MATCH: TradeMatch = {
  id: "match-payload",
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
  expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Barter store: granularity of the external state", () => {
  it("keeps the valid packages when a match in the same payload is unusable", () => {
    const { deliveryConfirmation, ...incomplete } = MATCH;
    const raw = JSON.stringify({
      packages: MARKED,
      matches: [incomplete, MATCH],
      papConfigArs: 50000,
    });

    const { store } = boot(raw);

    // The catalog survived, marker included...
    expect(stockOf(store, "pkg-vermut-pack4")).toBe(2);
    expect(store.getState().packages).toHaveLength(MARKED.length);
    // ...and only the unusable match is gone.
    expect(store.getState().matches).toHaveLength(1);
    expect(store.getState().matches[0]?.id).toBe(MATCH.id);
  });

  it("keeps the valid matches when a package in the same payload is unusable", () => {
    const raw = JSON.stringify({
      packages: [...MARKED, { ...SEED_PACKAGES[0], papValue: 0.5 }],
      matches: [MATCH],
      papConfigArs: 50000,
    });

    const { store } = boot(raw);

    expect(store.getState().packages).toHaveLength(MARKED.length);
    expect(stockOf(store, "pkg-vermut-pack4")).toBe(2);
    expect(store.getState().matches).toHaveLength(1);
    expect(store.getState().matches[0]?.status).toBe("WAITING_DELIVERY");
  });

  it("keeps the packages when the stored value carries no matches key", () => {
    const raw = JSON.stringify({ packages: MARKED, papConfigArs: 50000 });

    const { store } = boot(raw);

    expect(stockOf(store, "pkg-vermut-pack4")).toBe(2);
    expect(store.getState().matches).toEqual([]);
  });

  it("keeps a match whose package was dropped, since the screens handle it", () => {
    const raw = JSON.stringify({
      packages: [{ ...SEED_PACKAGES[0], id: "pkg-dropped", papValue: 0.5 }],
      matches: [
        { ...MATCH, offeredPackageId: "pkg-dropped", status: "PENDING" },
      ],
      papConfigArs: 50000,
    });

    const { store } = boot(raw);

    // No package is readable, so that slice falls back; the match is readable
    // and stays, pointing at an id the screens render as "Paquete no
    // disponible".
    expect(store.getState().packages).toEqual(SEED_PACKAGES);
    expect(store.getState().matches).toHaveLength(1);
  });

  it("falls back to the seeds only when nothing in the stored value is readable", () => {
    const { store } = boot(JSON.stringify({ packages: 42, matches: "nope" }));

    expect(store.getState().packages).toEqual(SEED_PACKAGES);
    expect(store.getState().matches).toEqual([]);
  });

  it("applies the readable half of a broadcast instead of dropping the message", () => {
    const { store, peer } = boot(undefined, true);
    const { deliveryConfirmation, ...incomplete } = MATCH;
    const postedBefore = peer.posted.length;

    peer.onmessage?.({
      data: {
        type: "BARTER_STATE_SYNC",
        payload: {
          packages: MARKED,
          matches: [incomplete, MATCH],
          papConfigArs: 50000,
        },
      },
    });

    expect(stockOf(store, "pkg-vermut-pack4")).toBe(2);
    expect(store.getState().matches).toHaveLength(1);
    expect(store.getState().matches[0]?.id).toBe(MATCH.id);
    // A synced message is never echoed back to the peer.
    expect(peer.posted.length).toBe(postedBefore);
  });

  it("does not throw on a slice that is not a list, and keeps the other one", () => {
    const { store, peer } = boot(undefined, true);

    expect(() =>
      peer.onmessage?.({
        data: {
          type: "BARTER_STATE_SYNC",
          payload: { packages: 42, matches: [MATCH], papConfigArs: 50000 },
        },
      }),
    ).not.toThrow();

    // The unreadable packages slice is treated as absent...
    expect(store.getState().packages).toEqual(SEED_PACKAGES);
    // ...while the readable matches are applied.
    expect(store.getState().matches).toHaveLength(1);
  });

  it("drops a match with a fractional totalPap on its own", () => {
    const raw = JSON.stringify({
      packages: MARKED,
      matches: [{ ...MATCH, totalPap: 0.5 }],
      papConfigArs: 50000,
    });

    const { store } = boot(raw);

    expect(stockOf(store, "pkg-vermut-pack4")).toBe(2);
    expect(store.getState().packages).toHaveLength(MARKED.length);
    expect(store.getState().matches).toEqual([]);
  });

  it("drops a match whose status is outside the schema on its own", () => {
    const raw = JSON.stringify({
      packages: MARKED,
      matches: [{ ...MATCH, status: "BOGUS" }],
      papConfigArs: 50000,
    });

    const { store } = boot(raw);

    expect(stockOf(store, "pkg-vermut-pack4")).toBe(2);
    expect(store.getState().packages).toHaveLength(MARKED.length);
    expect(store.getState().matches).toEqual([]);
  });
});
