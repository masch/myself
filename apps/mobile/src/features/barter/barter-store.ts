import {
  assertValidTransition,
  calculatePapValue,
  DEFAULT_PAP_VALUE_ARS,
  requiresStockRollback,
  type Producer,
  type ProductionType,
  type ProductPackage,
  type TradeMatch,
} from "@myself/shared";

export const SEED_PRODUCERS: Producer[] = [
  {
    id: "prod-vermut",
    name: "Vermut Sabado",
    productionType: "AGROECOLOGICAL",
    address: "Chacra Alimento, Umepay",
    latitude: -32.9982,
    longitude: -68.8789,
    phone: "+5492615551234",
  },
  {
    id: "prod-queso",
    name: "Naturaleza Viva",
    productionType: "ORGANIC",
    address: "Guadalupe Norte, Santa Fe",
    latitude: -28.9876,
    longitude: -59.6543,
    phone: "+5493482555678",
  },
  {
    id: "prod-miel",
    name: "Colmenas del Sol",
    productionType: "AGROECOLOGICAL",
    address: "Villa Las Rosas, Traslasierra, Córdoba",
    latitude: -31.9542,
    longitude: -65.0456,
    phone: "+5493544555999",
  },
];

export const SEED_PACKAGES: ProductPackage[] = [
  {
    id: "pkg-vermut-pack4",
    producerId: "prod-vermut",
    title: "Pack 4 Botellas Vermut Rosso 750ml",
    productionType: "AGROECOLOGICAL",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 6,
  },
  {
    id: "pkg-vermut-miel",
    producerId: "prod-vermut",
    title: "Miel Multiflora de Chacra 1kg",
    productionType: "AGROECOLOGICAL",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 4,
  },
  {
    id: "pkg-queso-gouda",
    producerId: "prod-queso",
    title: "Horma 2kg Queso Gouda Agroecológico",
    productionType: "ORGANIC",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 5,
  },
  {
    id: "pkg-queso-provoleta",
    producerId: "prod-queso",
    title: "Pack 6 Provoletas Estacionadas",
    productionType: "ORGANIC",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 3,
  },
  {
    id: "pkg-miel-1kg",
    producerId: "prod-miel",
    title: "Caja 3 Frascos Polen & Jalea Real",
    productionType: "AGROECOLOGICAL",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 5,
  },
];

export interface BarterState {
  producers: Producer[];
  packages: ProductPackage[];
  matches: TradeMatch[];
  activeProducerId: string;
  papConfigArs: number;
  maxDistanceKm?: number;
  productionTypeFilter?: ProductionType | "ALL";
}

export interface CreateStoreOptions {
  initialProducers?: Producer[];
  initialPackages?: ProductPackage[];
  initialMatches?: TradeMatch[];
  defaultActiveProducerId?: string;
  broadcastEnabled?: boolean;
}

const STORAGE_KEY = "p2p_barter_poc_state_v1";
const BROADCAST_CHANNEL_NAME = "p2p_barter_sync_channel";

export function createBarterStore(options: CreateStoreOptions = {}) {
  let isWeb =
    typeof window !== "undefined" && typeof localStorage !== "undefined";
  let channel: BroadcastChannel | null = null;

  if (
    isWeb &&
    options.broadcastEnabled !== false &&
    typeof BroadcastChannel !== "undefined"
  ) {
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    } catch {
      channel = null;
    }
  }

  // Initial producer resolution from query params (?producerId=...)
  let initialActiveId = options.defaultActiveProducerId ?? SEED_PRODUCERS[0].id;
  if (isWeb && typeof window.location !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlProducer = params.get("producerId") || params.get("producer");
      if (urlProducer) {
        initialActiveId = urlProducer;
      }
    } catch {
      // Ignored in non-browser envs
    }
  }

  // Load persisted state if on Web
  let persistedState: Partial<BarterState> = {};
  if (isWeb) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        persistedState = JSON.parse(raw);
      }
    } catch {
      persistedState = {};
    }
  }

  let state: BarterState = {
    producers:
      options.initialProducers ?? persistedState.producers ?? SEED_PRODUCERS,
    packages:
      options.initialPackages ?? persistedState.packages ?? SEED_PACKAGES,
    matches: options.initialMatches ?? persistedState.matches ?? [],
    activeProducerId: initialActiveId,
    papConfigArs: persistedState.papConfigArs ?? DEFAULT_PAP_VALUE_ARS,
    maxDistanceKm: undefined,
    productionTypeFilter: "ALL",
  };

  const listeners = new Set<() => void>();

  function notify(emitBroadcast = true) {
    if (isWeb) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            packages: state.packages,
            matches: state.matches,
            papConfigArs: state.papConfigArs,
          }),
        );
      } catch {
        // Ignored
      }
    }

    if (emitBroadcast && channel) {
      channel.postMessage({
        type: "BARTER_STATE_SYNC",
        payload: {
          packages: state.packages,
          matches: state.matches,
          papConfigArs: state.papConfigArs,
        },
      });
    }

    listeners.forEach((listener) => listener());
  }

  // Listen to remote tab broadcasts
  if (channel) {
    channel.onmessage = (event) => {
      if (event.data?.type === "BARTER_STATE_SYNC" && event.data.payload) {
        const { packages, matches, papConfigArs } = event.data.payload;
        state = {
          ...state,
          packages: packages ?? state.packages,
          matches: matches ?? state.matches,
          papConfigArs: papConfigArs ?? state.papConfigArs,
        };
        // Notify local components without re-broadcasting
        notify(false);
      }
    };
  }

  return {
    getState: (): BarterState => state,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setActiveProducer: (producerId: string) => {
      state = { ...state, activeProducerId: producerId };
      notify(false); // producer switch is local to this tab
    },

    setPapConfigArs: (papArs: number) => {
      state = { ...state, papConfigArs: papArs };
      notify(true);
    },

    setMaxDistanceKm: (distanceKm?: number) => {
      state = { ...state, maxDistanceKm: distanceKm };
      notify(false);
    },

    setProductionTypeFilter: (filter?: ProductionType | "ALL") => {
      state = { ...state, productionTypeFilter: filter };
      notify(false);
    },

    updatePackageStock: (packageId: string, stock: number) => {
      state = {
        ...state,
        packages: state.packages.map((pkg) =>
          pkg.id === packageId ? { ...pkg, stockUnits: stock } : pkg,
        ),
      };
      notify(true);
    },

    createTradeProposal: (input: {
      requesterId: string;
      targetProducerId: string;
      offeredPackageId: string;
      targetPackageId: string;
      papConfigArs?: number;
      ttlHours?: number;
    }): TradeMatch => {
      const offeredPkg = state.packages.find(
        (p) => p.id === input.offeredPackageId,
      );
      const targetPkg = state.packages.find(
        (p) => p.id === input.targetPackageId,
      );

      if (!offeredPkg || !targetPkg) {
        throw new Error("Specified product packages not found in catalog");
      }

      const papConfig = input.papConfigArs ?? state.papConfigArs;
      const ttl = input.ttlHours ?? 48;
      const expiresAt = new Date(Date.now() + ttl * 3600 * 1000).toISOString();
      const now = new Date().toISOString();

      const newMatch: TradeMatch = {
        id: `match-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        requesterId: input.requesterId,
        targetProducerId: input.targetProducerId,
        offeredPackageId: input.offeredPackageId,
        targetPackageId: input.targetPackageId,
        papSnapshotArs: papConfig,
        totalPap: calculatePapValue(offeredPkg.priceArs, papConfig),
        status: "PENDING",
        deliveryConfirmation: {
          confirmedByRequester: false,
          confirmedByTarget: false,
        },
        expiresAt,
        createdAt: now,
        updatedAt: now,
      };

      state = {
        ...state,
        matches: [newMatch, ...state.matches],
      };

      notify(true);
      return newMatch;
    },

    acceptTradeMatch: (matchId: string): TradeMatch => {
      const match = state.matches.find((m) => m.id === matchId);
      if (!match) {
        throw new Error(`Match ${matchId} not found`);
      }

      assertValidTransition(match.status, "ACCEPTED");

      const offeredPkg = state.packages.find(
        (p) => p.id === match.offeredPackageId,
      );
      const targetPkg = state.packages.find(
        (p) => p.id === match.targetPackageId,
      );

      if (!offeredPkg || !targetPkg) {
        throw new Error("One or both trade packages missing from catalog");
      }

      if (offeredPkg.stockUnits <= 0 || targetPkg.stockUnits <= 0) {
        throw new Error("Insufficient stock to accept trade");
      }

      // Decrement stock for both packages
      let nextPackages = state.packages.map((pkg) => {
        if (pkg.id === offeredPkg.id) {
          return { ...pkg, stockUnits: pkg.stockUnits - 1 };
        }
        if (pkg.id === targetPkg.id) {
          return { ...pkg, stockUnits: pkg.stockUnits - 1 };
        }
        return pkg;
      });

      // Update current match to WAITING_DELIVERY (transitioned via ACCEPTED)
      const now = new Date().toISOString();
      const acceptedMatch: TradeMatch = {
        ...match,
        status: "WAITING_DELIVERY",
        updatedAt: now,
      };

      // Cascade cancellation: check if remaining stock in nextPackages is 0
      // Any other pending or countered matches demanding depleted packages must be cancelled
      const nextMatches = state.matches.map((m) => {
        if (m.id === matchId) {
          return acceptedMatch;
        }

        if (m.status === "PENDING" || m.status === "COUNTER_OFFERED") {
          const reqPkg = nextPackages.find((p) => p.id === m.offeredPackageId);
          const tgtPkg = nextPackages.find((p) => p.id === m.targetPackageId);

          if (
            (reqPkg && reqPkg.stockUnits <= 0) ||
            (tgtPkg && tgtPkg.stockUnits <= 0)
          ) {
            return {
              ...m,
              status: "CANCELLED_INSUFFICIENT_STOCK" as const,
              updatedAt: now,
            };
          }
        }

        return m;
      });

      state = {
        ...state,
        packages: nextPackages,
        matches: nextMatches,
      };

      notify(true);
      return acceptedMatch;
    },

    rejectTradeMatch: (matchId: string): TradeMatch => {
      const match = state.matches.find((m) => m.id === matchId);
      if (!match) throw new Error(`Match ${matchId} not found`);

      assertValidTransition(match.status, "REJECTED");

      const updated: TradeMatch = {
        ...match,
        status: "REJECTED",
        updatedAt: new Date().toISOString(),
      };

      state = {
        ...state,
        matches: state.matches.map((m) => (m.id === matchId ? updated : m)),
      };

      notify(true);
      return updated;
    },

    counterOfferTradeMatch: (input: {
      matchId: string;
      targetProducerId: string;
      counterOfferedPackageId: string;
    }): TradeMatch => {
      const match = state.matches.find((m) => m.id === input.matchId);
      if (!match) throw new Error(`Match ${input.matchId} not found`);

      assertValidTransition(match.status, "COUNTER_OFFERED");

      const counterPkg = state.packages.find(
        (p) => p.id === input.counterOfferedPackageId,
      );
      if (!counterPkg) throw new Error("Counter-offered package not found");

      const now = new Date().toISOString();
      const updated: TradeMatch = {
        ...match,
        status: "COUNTER_OFFERED",
        offeredPackageId: input.counterOfferedPackageId,
        counterOfferHistory: {
          previousOfferedPackageId: match.offeredPackageId,
          counterOfferedAt: now,
        },
        updatedAt: now,
      };

      state = {
        ...state,
        matches: state.matches.map((m) =>
          m.id === input.matchId ? updated : m,
        ),
      };

      notify(true);
      return updated;
    },

    confirmDelivery: (matchId: string, producerId: string): TradeMatch => {
      const match = state.matches.find((m) => m.id === matchId);
      if (!match) throw new Error(`Match ${matchId} not found`);

      if (match.status !== "WAITING_DELIVERY") {
        throw new Error(
          `Cannot confirm delivery for match in status ${match.status}`,
        );
      }

      const isRequester = producerId === match.requesterId;
      const isTarget = producerId === match.targetProducerId;

      if (!isRequester && !isTarget) {
        throw new Error("Producer not party to this trade");
      }

      const nextConfirmation = {
        confirmedByRequester: isRequester
          ? true
          : match.deliveryConfirmation.confirmedByRequester,
        confirmedByTarget: isTarget
          ? true
          : match.deliveryConfirmation.confirmedByTarget,
      };

      const isCompleted =
        nextConfirmation.confirmedByRequester &&
        nextConfirmation.confirmedByTarget;

      const now = new Date().toISOString();
      const updated: TradeMatch = {
        ...match,
        deliveryConfirmation: nextConfirmation,
        status: isCompleted ? "COMPLETED" : "WAITING_DELIVERY",
        updatedAt: now,
      };

      state = {
        ...state,
        matches: state.matches.map((m) => (m.id === matchId ? updated : m)),
      };

      notify(true);
      return updated;
    },

    cancelTradeMatch: (matchId: string, _producerId: string): TradeMatch => {
      const match = state.matches.find((m) => m.id === matchId);
      if (!match) throw new Error(`Match ${matchId} not found`);

      assertValidTransition(match.status, "CANCELLED_BY_PRODUCER");

      // Rollback stock if previously deducted
      let nextPackages = state.packages;
      if (requiresStockRollback(match.status, "CANCELLED_BY_PRODUCER")) {
        nextPackages = state.packages.map((pkg) => {
          if (
            pkg.id === match.offeredPackageId ||
            pkg.id === match.targetPackageId
          ) {
            return { ...pkg, stockUnits: pkg.stockUnits + 1 };
          }
          return pkg;
        });
      }

      const updated: TradeMatch = {
        ...match,
        status: "CANCELLED_BY_PRODUCER",
        updatedAt: new Date().toISOString(),
      };

      state = {
        ...state,
        packages: nextPackages,
        matches: state.matches.map((m) => (m.id === matchId ? updated : m)),
      };

      notify(true);
      return updated;
    },

    checkExpiredMatches: () => {
      const now = Date.now();
      let hasChanges = false;

      const nextMatches = state.matches.map((m) => {
        if (
          (m.status === "PENDING" || m.status === "COUNTER_OFFERED") &&
          new Date(m.expiresAt).getTime() < now
        ) {
          hasChanges = true;
          return {
            ...m,
            status: "EXPIRED" as const,
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      });

      if (hasChanges) {
        state = { ...state, matches: nextMatches };
        notify(true);
      }
    },

    resetToSeed: () => {
      state = {
        ...state,
        producers: SEED_PRODUCERS,
        packages: SEED_PACKAGES,
        matches: [],
        papConfigArs: DEFAULT_PAP_VALUE_ARS,
      };
      notify(true);
    },
  };
}

export type BarterStore = ReturnType<typeof createBarterStore>;

// Singleton instance for the mobile app
export const globalBarterStore = createBarterStore();
