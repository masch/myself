/**
 * Pins the contract behind the external-state granularity rule (issue #83,
 * item 2): the state the store itself writes must be readable by its own
 * schema. If a store change ever persists something `productPackageSchema` or
 * `tradeMatchSchema` rejects, the next boot silently falls back to the seeds
 * instead of failing loudly - the same failure class the granularity rule was
 * about.
 *
 * The other half of this guard lives in `barter-external-state.test.ts`, which
 * pins the granularity of payloads written from outside the store.
 */
import { afterEach, describe, expect, it } from "bun:test";
import {
  createBarterStore,
  PRODUCER_IDS,
  SEED_PACKAGES,
  SEED_PRODUCERS,
} from "../barter-store";

const STORAGE_KEY = "p2p_barter_poc_state_v1";
let mem: Map<string, string>;
const saved = new Map<string, unknown>();

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
  (globalThis as Record<string, unknown>).window = { location: { search: "" } };
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => void mem.set(key, value),
    removeItem: (key: string) => void mem.delete(key),
    clear: () => void mem.clear(),
  };
  (globalThis as Record<string, unknown>).BroadcastChannel = undefined;
}

function boot(raw?: string) {
  stub();
  if (raw !== undefined) mem.set(STORAGE_KEY, raw);
  return createBarterStore({
    initialProducers: SEED_PRODUCERS,
    broadcastEnabled: false,
  });
}

describe("barter store: the state it writes itself", () => {
  it("reloads, intact, the state the store just persisted", () => {
    const first = boot();
    const proposal = first.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "pkg-vermut-pack4",
      targetPackageId: "pkg-queso-gouda",
    });
    first.acceptTradeMatch(proposal.id);
    first.updatePackageStock("pkg-vermut-pack4", 1);

    const raw = mem.get(STORAGE_KEY);
    expect(typeof raw).toBe("string");
    expect(Object.keys(JSON.parse(raw!)).sort()).toEqual([
      "matches",
      "packages",
      "papConfigArs",
    ]);

    const second = boot(raw);

    // Nothing was dropped on the way back in...
    expect(second.getState().packages).toEqual(first.getState().packages);
    expect(second.getState().matches).toEqual(first.getState().matches);
    expect(second.getState().papConfigArs).toBe(first.getState().papConfigArs);
    // ...which a silent fall back to the seeds would have broken, both by
    // emptying the matches and by restoring the seeded stock.
    expect(second.getState().matches).toHaveLength(1);
    expect(second.getState().matches[0]?.status).toBe("WAITING_DELIVERY");
    expect(second.getState().packages).not.toEqual(SEED_PACKAGES);
  });
});
