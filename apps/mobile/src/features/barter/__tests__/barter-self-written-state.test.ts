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
import { DEFAULT_PAP_VALUE_ARS } from "@myself/shared";
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
  it("reloads, intact, the runtime state the store just persisted", () => {
    const first = boot();
    const proposal = first.createTradeProposal({
      requesterId: PRODUCER_IDS.VERMUT,
      targetProducerId: PRODUCER_IDS.QUESO,
      offeredPackageId: "cat-890",
      targetPackageId: "cat-5",
    });
    first.acceptTradeMatch(proposal.id);
    first.updatePackageStock("cat-890", 3);

    const raw = mem.get(STORAGE_KEY);
    expect(typeof raw).toBe("string");
    expect(Object.keys(JSON.parse(raw!)).sort()).toEqual([
      "matches",
      "packages",
      "papConfigArs",
    ]);

    const second = boot(raw);

    // The catalog always boots from the seed — packages and PAP start fresh —
    // but the trades the first store created survive the reload: matches are
    // the runtime state persistence exists to carry.
    expect(second.getState().packages).toEqual(SEED_PACKAGES);
    expect(second.getState().matches).toEqual(first.getState().matches);
    expect(second.getState().papConfigArs).toBe(DEFAULT_PAP_VALUE_ARS);
    expect(second.getState().matches).toHaveLength(1);
    expect(second.getState().matches[0]?.status).toBe("WAITING_DELIVERY");
  });
});
