import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  createBarterStore,
  PRODUCER_IDS,
  SEED_PACKAGES,
} from "../barter-store";

/**
 * Pins S2 on the path a user actually reaches: a stored install written before the
 * catalog cleans itself on boot. The gondola is catalog-only, so a package the
 * printed catalog does not derive never comes back — not from the stored bytes and
 * not from a tab still running the previous bundle.
 */

/** The key the barter store persists its own state under. */
const STORAGE_KEY = "p2p_barter_poc_state_v1";

let storage: Map<string, string>;
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

/** The four handwritten packages a stored install still carries. */
const STORED_POC_PACKAGES = [
  {
    id: "pkg-vermut-pack4",
    producerId: PRODUCER_IDS.VERMUT,
    title: "Pack 4 Botellas Vermut Rosso 750ml",
    productionType: "AGROECOLOGICAL" as const,
    priceArs: 50000,
    papValue: 1,
    stockUnits: 6,
  },
  {
    id: "pkg-vermut-miel",
    producerId: PRODUCER_IDS.VERMUT,
    title: "Miel Multiflora de Chacra 1kg",
    productionType: "AGROECOLOGICAL" as const,
    priceArs: 50000,
    papValue: 1,
    stockUnits: 4,
  },
  {
    id: "pkg-queso-gouda",
    producerId: PRODUCER_IDS.QUESO,
    title: "Horma 2kg Queso Gouda Agroecológico",
    productionType: "ORGANIC" as const,
    priceArs: 50000,
    papValue: 1,
    stockUnits: 5,
  },
  {
    id: "pkg-queso-provoleta",
    producerId: PRODUCER_IDS.QUESO,
    title: "Pack 6 Provoletas Estacionadas",
    productionType: "ORGANIC" as const,
    priceArs: 50000,
    papValue: 1,
    stockUnits: 3,
  },
];

/** A stored 1:1 trade between two of those packages. */
function storedMatch(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();

  return {
    id: "match-stored",
    requesterId: PRODUCER_IDS.VERMUT,
    targetProducerId: PRODUCER_IDS.QUESO,
    offeredPackageId: "pkg-vermut-pack4",
    targetPackageId: "pkg-queso-gouda",
    papSnapshotArs: 50000,
    totalPap: 1,
    status: "PENDING" as const,
    deliveryConfirmation: {
      confirmedByRequester: false,
      confirmedByTarget: false,
    },
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  storage = new Map();
  peers = [];
  for (const key of ["window", "localStorage", "BroadcastChannel"]) {
    saved.set(key, (globalThis as Record<string, unknown>)[key]);
  }
  (globalThis as Record<string, unknown>).window = { location: { search: "" } };
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
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

function boot(raw: unknown) {
  storage.set(STORAGE_KEY, JSON.stringify(raw));

  return createBarterStore({ broadcastEnabled: false });
}

describe("a stored install written before the catalog", () => {
  it("keeps only the packages the printed catalog derives", () => {
    const state = boot({
      packages: [
        ...STORED_POC_PACKAGES,
        { ...SEED_PACKAGES[0], stockUnits: 0 },
      ],
      matches: [],
      papConfigArs: 50000,
    }).getState();

    expect(state.packages.filter((pkg) => pkg.id.startsWith("pkg-"))).toEqual(
      [],
    );
    // The package the catalog does derive keeps the stock the stored trade left.
    expect(
      state.packages.find((pkg) => pkg.id === SEED_PACKAGES[0].id),
    ).toEqual({ ...SEED_PACKAGES[0], stockUnits: 0 });
    expect(state.packages).toHaveLength(SEED_PACKAGES.length);
  });

  it("moves a stored match onto the catalog package that carries the product", () => {
    const state = boot({
      packages: STORED_POC_PACKAGES,
      matches: [storedMatch()],
      papConfigArs: 50000,
    }).getState();

    expect(state.matches).toHaveLength(1);
    expect(state.matches[0].offeredPackageId).toBe("cat-890");
    expect(state.matches[0].targetPackageId).toBe("cat-5");
  });

  it("drops a stored match whose product the catalog does not print", () => {
    const state = boot({
      packages: STORED_POC_PACKAGES,
      matches: [
        storedMatch({ id: "match-miel", offeredPackageId: "pkg-vermut-miel" }),
        storedMatch({
          id: "match-provoleta",
          targetPackageId: "pkg-queso-provoleta",
        }),
      ],
      papConfigArs: 50000,
    }).getState();

    expect(state.matches).toEqual([]);
  });

  it("writes the cleaned state back instead of carrying it forever", () => {
    const store = boot({
      packages: STORED_POC_PACKAGES,
      matches: [storedMatch()],
      papConfigArs: 50000,
    });

    // Any command persists the state the store now holds.
    store.updatePackageStock("cat-5", 0);

    const written = JSON.parse(storage.get(STORAGE_KEY) ?? "{}") as {
      packages?: { id: string }[];
      matches?: { offeredPackageId: string }[];
    };

    expect(
      written.packages?.filter((pkg) => pkg.id.startsWith("pkg-")),
    ).toEqual([]);
    expect(written.matches?.[0]?.offeredPackageId).toBe("cat-890");
  });

  it("ignores a peer tab still broadcasting the retired packages", () => {
    const store = createBarterStore({});
    const peer = peers.at(-1)!;

    peer.onmessage?.({
      data: {
        type: "BARTER_STATE_SYNC",
        payload: {
          packages: STORED_POC_PACKAGES,
          matches: [],
          papConfigArs: 50000,
        },
      },
    });

    const packages = store.getState().packages;

    expect(packages.filter((pkg) => pkg.id.startsWith("pkg-"))).toEqual([]);
    expect(packages).toHaveLength(SEED_PACKAGES.length);
  });

  it("never lets a peer trade arrive naming a package this build cannot derive", () => {
    const store = createBarterStore({});
    const peer = peers.at(-1)!;

    peer.onmessage?.({
      data: {
        type: "BARTER_STATE_SYNC",
        payload: {
          packages: [],
          matches: [
            storedMatch({ id: "match-peer" }),
            storedMatch({
              id: "match-peer-miel",
              offeredPackageId: "pkg-vermut-miel",
            }),
          ],
          papConfigArs: 50000,
        },
      },
    });

    const matches = store.getState().matches;

    expect(matches.map((match) => match.id)).toEqual(["match-peer"]);
    expect(matches[0]?.offeredPackageId).toBe("cat-890");
    expect(matches[0]?.targetPackageId).toBe("cat-5");
  });
});
