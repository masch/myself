import {
  assertValidTransition,
  calculatePapValue,
  DEFAULT_PAP_VALUE_ARS,
  productPackageSchema,
  requiresStockRollback,
  tradeMatchSchema,
  type Producer,
  type ProductionType,
  type ProductPackage,
  type TradeMatch,
} from "@myself/shared";

/**
 * Canonical producer ids.
 *
 * Seeded packages point at their producer through these constants instead of
 * repeating the literal, so a package can never reference a producer that does
 * not exist.
 *
 * These values are a persisted contract: every stored package carries one, and
 * they are the `?producerId=` link values. A value may only be renamed together
 * with an entry in `RENAMED_PRODUCER_IDS`, which translates both the stored
 * state and the links written by a previous build.
 */
export const PRODUCER_IDS = {
  VERMUT: "sabado",
  QUESO: "naturaleza-viva",
  MIEL: "colmenas-del-sol",
} as const;

export const SEED_PRODUCERS: Producer[] = [
  {
    id: PRODUCER_IDS.VERMUT,
    name: "Vermut Sabado",
    productionType: "AGROECOLOGICAL",
    address: "Chacra Alimento, Umepay",
    latitude: -32.9982,
    longitude: -68.8789,
    phone: "+5492615551234",
  },
  {
    id: PRODUCER_IDS.QUESO,
    name: "Naturaleza Viva",
    productionType: "ORGANIC",
    address: "Guadalupe Norte, Santa Fe",
    latitude: -28.9876,
    longitude: -59.6543,
    phone: "+5493482555678",
  },
  {
    id: PRODUCER_IDS.MIEL,
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
    producerId: PRODUCER_IDS.VERMUT,
    title: "Pack 4 Botellas Vermut Rosso 750ml",
    productionType: "AGROECOLOGICAL",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 6,
  },
  {
    id: "pkg-vermut-miel",
    producerId: PRODUCER_IDS.VERMUT,
    title: "Miel Multiflora de Chacra 1kg",
    productionType: "AGROECOLOGICAL",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 4,
  },
  {
    id: "pkg-queso-gouda",
    producerId: PRODUCER_IDS.QUESO,
    title: "Horma 2kg Queso Gouda Agroecológico",
    productionType: "ORGANIC",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 5,
  },
  {
    id: "pkg-queso-provoleta",
    producerId: PRODUCER_IDS.QUESO,
    title: "Pack 6 Provoletas Estacionadas",
    productionType: "ORGANIC",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 3,
  },
  {
    id: "pkg-miel-1kg",
    producerId: PRODUCER_IDS.MIEL,
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

/**
 * Normalizes a producer reference for comparison: case-insensitive, without
 * surrounding or repeated whitespace, and treating dashes and underscores as
 * spaces so a slug-shaped name still matches its display form.
 */
function normalizeProducerReference(value: string): string {
  return value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

/**
 * Producer ids that were renamed, mapped to the value they carry today.
 *
 * Both the persisted state and the links already handed out still name the old
 * ids, so they are translated instead of dropped.
 */
const RENAMED_PRODUCER_IDS: Record<string, string> = {
  "prod-vermut": PRODUCER_IDS.VERMUT,
  "prod-queso": PRODUCER_IDS.QUESO,
  "prod-miel": PRODUCER_IDS.MIEL,
};

/** Translates the former id of a renamed producer to its current value. */
export function migrateProducerId(producerId: string): string {
  return RENAMED_PRODUCER_IDS[producerId] ?? producerId;
}

/**
 * Rewrites the producer ids inside a state written by a previous build.
 *
 * Every stored package and match carries a producer id, and a persisted state
 * may also carry the producer list itself, so a rename has to travel with the
 * data: without this rewrite the packages drop out of the gondola and the
 * matches point at producers that no longer exist.
 */
export function migratePersistedState(
  state: Partial<BarterState>,
): Partial<BarterState> {
  return {
    ...state,
    producers: state.producers?.map((producer) => ({
      ...producer,
      id: migrateProducerId(producer.id),
    })),
    packages: state.packages?.map((pkg) => ({
      ...pkg,
      producerId: migrateProducerId(pkg.producerId),
    })),
    matches: state.matches?.map((match) => ({
      ...match,
      requesterId: migrateProducerId(match.requesterId),
      targetProducerId: migrateProducerId(match.targetProducerId),
    })),
  };
}

/**
 * Validates a payload that came from outside the store, after migration.
 *
 * Persisted bytes and broadcast messages are written by another build, another
 * tab, or a user with devtools open, so neither reaches the state before it
 * parses against the shared schemas: a stored match without
 * `deliveryConfirmation` used to pass the load path and then crash inside
 * `confirmDelivery`. Returns `null` when either list fails, so the caller
 * falls back to the seed catalog (load) or drops the message (broadcast).
 */
function parseExternalState(
  state: Partial<BarterState>,
): Partial<BarterState> | null {
  const packages = productPackageSchema.array().safeParse(state.packages);
  const matches = tradeMatchSchema.array().safeParse(state.matches);

  if (!packages.success || !matches.success) {
    return null;
  }

  return { ...state, packages: packages.data, matches: matches.data };
}

/**
 * Refuses a pre-completion command on a proposal whose TTL already elapsed.
 *
 * `checkExpiredMatches` only sweeps when a screen mounts, so an expiry that
 * elapses while the inbox stays open would still let the target reserve stock.
 * The rule is enforced in the transition itself, with the same predicate the
 * sweep uses.
 */
function assertProposalNotExpired(match: TradeMatch): void {
  if (
    (match.status === "PENDING" || match.status === "COUNTER_OFFERED") &&
    new Date(match.expiresAt).getTime() < Date.now()
  ) {
    throw new Error(`Trade proposal expired at ${match.expiresAt}`);
  }
}

/**
 * Resolves a `?producerId=` / `?producer=` value to a producer id.
 *
 * The value may be either the producer id or its display name. Names are
 * compared case-insensitively and ignore spacing differences, so
 * `Naturaleza Viva`, `naturaleza viva` and `naturaleza-viva` all resolve to
 * the same producer. A renamed producer still resolves through its former id
 * (see `migrateProducerId`), so an older link keeps working. Returns
 * `undefined` when nothing matches.
 */
export function resolveProducerId(
  producers: Producer[],
  rawValue: string | null | undefined,
): string | undefined {
  if (!rawValue) {
    return undefined;
  }

  const reference = migrateProducerId(rawValue);
  const byId = producers.find((producer) => producer.id === reference);

  if (byId) {
    return byId.id;
  }

  const wanted = normalizeProducerReference(reference);

  return producers.find(
    (producer) => normalizeProducerReference(producer.name) === wanted,
  )?.id;
}

/**
 * Builds the link that opens the barter screen operating as `producerId`.
 *
 * The id is what we hand out, not the display name: it is the value every
 * stored package and every match carries, so the link keeps working after a
 * producer is renamed. A display name still resolves when typed by hand (see
 * `resolveProducerId`), which is why the value is encoded here.
 */
export function buildProducerLink(origin: string, producerId: string): string {
  return `${origin}/barter?producerId=${encodeURIComponent(producerId)}`;
}

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

  // Load persisted state if on Web
  let persistedState: Partial<BarterState> = {};
  if (isWeb) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // A state written before a producer rename still carries the old ids.
        // It is validated after that rewrite, so a migrated id is not mistaken
        // for a malformed one.
        persistedState =
          parseExternalState(migratePersistedState(JSON.parse(raw))) ?? {};
      }
    } catch {
      persistedState = {};
    }
  }

  // Producers this store runs with: explicit options win over persisted state.
  const producers =
    options.initialProducers ?? persistedState.producers ?? SEED_PRODUCERS;

  // Initial producer resolution from query params (?producerId=...)
  let initialActiveId = options.defaultActiveProducerId ?? SEED_PRODUCERS[0].id;
  if (isWeb && typeof window.location !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlProducer = params.get("producerId") || params.get("producer");
      if (urlProducer) {
        const resolvedId = resolveProducerId(producers, urlProducer);

        if (resolvedId) {
          initialActiveId = resolvedId;
        } else {
          console.warn(
            `[barter] Unknown producer "${urlProducer}" in the URL. Use one of: ${producers
              .map((producer) => `"${producer.id}" or "${producer.name}"`)
              .join(", ")}.`,
          );
        }
      }
    } catch {
      // Ignored in non-browser envs
    }
  }

  let state: BarterState = {
    producers,
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
        // A tab still running the previous bundle broadcasts the former ids.
        const synced = migratePersistedState({
          packages,
          matches,
          papConfigArs,
        });
        const validated = parseExternalState(synced);

        // A message that does not parse is dropped before it reaches the state
        // (and it is never echoed back to the peer).
        if (!validated) {
          return;
        }

        state = {
          ...state,
          packages: validated.packages ?? state.packages,
          matches: validated.matches ?? state.matches,
          papConfigArs: validated.papConfigArs ?? state.papConfigArs,
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

      if (offeredPkg.producerId !== input.requesterId) {
        throw new Error(
          "Offered package must belong to the requesting producer",
        );
      }

      if (targetPkg.producerId !== input.targetProducerId) {
        throw new Error("Target package must belong to the target producer");
      }

      if (input.requesterId === input.targetProducerId) {
        throw new Error("A producer cannot trade with itself");
      }

      // Whole PAP units traded 1:1: an unbalanced pair is not a barter.
      if (offeredPkg.papValue !== targetPkg.papValue) {
        throw new Error(
          `Trade packages must have the same PAP value: offered ${offeredPkg.papValue} PAP, target ${targetPkg.papValue} PAP`,
        );
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
      assertProposalNotExpired(match);

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
      assertProposalNotExpired(match);

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
      assertProposalNotExpired(match);

      if (input.targetProducerId !== match.targetProducerId) {
        throw new Error(
          "Only the target producer of a trade can counter-offer",
        );
      }

      const counterPkg = state.packages.find(
        (p) => p.id === input.counterOfferedPackageId,
      );
      if (!counterPkg) throw new Error("Counter-offered package not found");

      // The counter package comes out of the requester's own catalog: a package
      // of the target would be a self-swap that leaves the requester empty
      // handed.
      if (counterPkg.producerId !== match.requesterId) {
        throw new Error("Counter-offered package must belong to the requester");
      }

      // The counter keeps the trade balanced: same PAP value, or the 1:1 rule
      // no longer holds for the pair.
      if (counterPkg.papValue !== match.totalPap) {
        throw new Error(
          `Counter-offered package must have the same PAP value as the trade: ${counterPkg.papValue} PAP vs ${match.totalPap} PAP`,
        );
      }

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

    cancelTradeMatch: (matchId: string, producerId: string): TradeMatch => {
      const match = state.matches.find((m) => m.id === matchId);
      if (!match) throw new Error(`Match ${matchId} not found`);

      assertValidTransition(match.status, "CANCELLED_BY_PRODUCER");

      // Cancelling rolls back stock, so only the two parties may do it.
      const isRequester = producerId === match.requesterId;
      const isTarget = producerId === match.targetProducerId;

      if (!isRequester && !isTarget) {
        throw new Error("Producer not party to this trade");
      }

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
