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
import { catalogPackages } from "./catalog-packages";
import { PRIMAVERA_2026_PRODUCERS } from "./producer-catalog";

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
} as const;

/**
 * The printed catalog and nothing else: every producer the app seeds is one the
 * Primavera 2026 catalog prints.
 *
 * A copy, not the catalog's own array: the two constants answer different
 * questions and a caller that mutates the seeded list must not reach into the
 * catalog the transcription pins.
 */
export const SEED_PRODUCERS: Producer[] = [...PRIMAVERA_2026_PRODUCERS];

/**
 * The packages the app seeds: every product the Primavera 2026 catalog prints,
 * in printed order, each holding what is worth 1 PAP (see `catalog-packages.ts`),
 * so a stored install and an injected test store run the same catalog.
 *
 * Nothing is handwritten here. The four POC packages this seed used to carry are
 * retired: the catalog derives an equivalent for two of them, and a state that
 * still stores one is rewritten on load by `retireSeedPackages`.
 */
export const SEED_PACKAGES: ProductPackage[] = [...catalogPackages()];

export interface BarterState {
  producers: Producer[];
  packages: ProductPackage[];
  matches: TradeMatch[];
  activeProducerId: string;
  papConfigArs: number;
  maxDistanceKm?: number;
  productionTypeFilter?: ProductionType | "ALL";
  /**
   * The producer the gondola is narrowed to, when the user pressed that card's
   * filter chip. It is **not** `activeProducerId`: that one is who is looking and
   * is excluded from the gondola, this one chooses which shelf is in it.
   */
  producerFilterId?: string;
}

export interface CreateStoreOptions {
  initialProducers?: Producer[];
  /**
   * An explicit package list for the caller, and the one entry point the
   * catalog-only purge does not rewrite: injected packages are a contract with
   * the caller, never the app's own data. A test uses it to pin a guard against
   * a package of a known price and stock; a persisted state or a peer tab is
   * always written back to catalog packages only, so an injected list that gets
   * saved is purged on the next load.
   */
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
  // The destination is a producer this build no longer ships, so a link or a
  // stored state naming it resolves to nothing and falls back to the default
  // identity instead of dangling on an unknown id.
  "prod-miel": "colmenas-del-sol",
};

/** Translates the former id of a renamed producer to its current value. */
export function migrateProducerId(producerId: string): string {
  return RENAMED_PRODUCER_IDS[producerId] ?? producerId;
}

/**
 * Producers this store runs with.
 *
 * The printed catalog is always the base, and a producer a persisted state
 * carries on top of it is appended instead of replacing it. Without that, a
 * state written by a build with a shorter catalog pins its own list forever and
 * the catalog this build ships never reaches those installs. The catalog wins on
 * a shared id, because its entry is the curated one, and the appended extras keep
 * whatever stored package or match already points at them alive.
 */
/**
 * Merges a peer tab's package list into the one this tab already has.
 *
 * A tab still running a bundle from before the printed catalog broadcasts the
 * four POC packages and nothing else; replacing the local list with it would drop
 * all 1527 catalog packages, persist the shorter list, and let the next reload
 * re-add them with seed stock — resurrecting stock a real trade had consumed.
 * So the peer wins for the ids it carries (its stock is at least as fresh) and
 * this tab keeps every id the peer does not know about.
 */
export function mergePeerPackages(
  current: ProductPackage[],
  incoming: ProductPackage[] | undefined,
): ProductPackage[] {
  // A tab still running a bundle from before the catalog broadcasts the retired
  // POC packs. A package this build cannot derive is not a package the user may
  // trade, so a sync never resurrects one.
  const catalogIncoming = incoming?.filter((pkg) =>
    CATALOG_PACKAGE_IDS.has(pkg.id),
  );

  if (!catalogIncoming) {
    return current;
  }

  const incomingById = new Map(catalogIncoming.map((pkg) => [pkg.id, pkg]));
  const currentIds = new Set(current.map((pkg) => pkg.id));

  return [
    // Same order as this tab: a peer that never saw the catalog updates the four
    // packs without reshuffling the gondola.
    ...current.map((pkg) => incomingById.get(pkg.id) ?? pkg),
    // A package only the peer carries is still a package the user may trade.
    ...catalogIncoming.filter((pkg) => !currentIds.has(pkg.id)),
  ];
}

export function mergeCatalogProducers(persisted?: Producer[]): Producer[] {
  if (!persisted?.length) {
    return SEED_PRODUCERS;
  }

  const catalogIds = new Set(SEED_PRODUCERS.map((producer) => producer.id));
  const onlyPersisted = persisted.filter(
    (producer) => !catalogIds.has(producer.id),
  );

  return onlyPersisted.length === 0
    ? SEED_PRODUCERS
    : [...SEED_PRODUCERS, ...onlyPersisted];
}

/**
 * Packages this store runs with.
 *
 * `SEED_PACKAGES` is the base and a persisted list is merged into it the same way
 * `mergeCatalogProducers` merges the producers: a state written by a build with a
 * shorter catalog must still receive the products this build ships. The catalog
 * is appended, never substituted, so the stored package always wins on a shared
 * id — a package whose stock a real trade consumed is never resurrected with
 * seed stock. A persisted package the catalog does not carry stays in the list,
 * because a stored package or match may already point at it.
 */
export function mergeCatalogPackages(
  persisted?: ProductPackage[],
): ProductPackage[] {
  if (!persisted?.length) {
    return SEED_PACKAGES;
  }

  const persistedIds = new Set(persisted.map((pkg) => pkg.id));
  const missing = SEED_PACKAGES.filter((pkg) => !persistedIds.has(pkg.id));

  return missing.length === 0 ? persisted : [...persisted, ...missing];
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
    producers: asList<Producer>(state.producers)?.map((producer) => ({
      ...producer,
      id: migrateProducerId(producer.id),
    })),
    packages: asList<ProductPackage>(state.packages)?.map((pkg) => ({
      ...pkg,
      producerId: migrateProducerId(pkg.producerId),
    })),
    matches: asList<TradeMatch>(state.matches)?.map((match) => ({
      ...match,
      requesterId: migrateProducerId(match.requesterId),
      targetProducerId: migrateProducerId(match.targetProducerId),
    })),
  };
}

/** Every package id this build derives from the printed catalog. */
const CATALOG_PACKAGE_IDS: ReadonlySet<string> = new Set(
  SEED_PACKAGES.map((pkg) => pkg.id),
);

/**
 * The retired packages the printed catalog carries as the same product, and the
 * catalog package that replaces each one.
 *
 * Everything else that is not a catalog package has no equivalent — the catalog
 * prints no such product, or prints it from another producer — so the purge drops
 * it instead of crediting a package that hands over something different.
 */
export const RETIRED_PACKAGE_REMAP: Readonly<Record<string, string>> = {
  "pkg-vermut-pack4": "cat-890",
  "pkg-queso-gouda": "cat-5",
};

/**
 * Keeps only the packages this build derives from the printed catalog, and the
 * matches between them.
 *
 * The gondola is catalog-only: a package that is not one of `catalogIds` carries
 * a price, a presentation and a producer this build does not print, so it is
 * dropped. A match naming a dropped package moves to the catalog package that
 * carries the same product when `RETIRED_PACKAGE_REMAP` knows one, and is dropped
 * otherwise — a trade with a side that no longer exists can neither be shown nor
 * accepted. A counter-offer history naming a dropped id is dropped rather than
 * kept as a dangling reference; the trade itself is what matters.
 *
 * `catalogIds` is injectable so a test can pin the rule against a small set.
 */
export function keepOnlyCatalogPackages(
  state: Partial<BarterState>,
  catalogIds: ReadonlySet<string> = CATALOG_PACKAGE_IDS,
): Partial<BarterState> {
  const remap = (packageId: string): string | null =>
    catalogIds.has(packageId)
      ? packageId
      : (RETIRED_PACKAGE_REMAP[packageId] ?? null);

  const packages = asList<ProductPackage>(state.packages)?.filter((pkg) =>
    catalogIds.has(pkg.id),
  );

  const matches = asList<TradeMatch>(state.matches)?.flatMap((match) => {
    const offered = remap(match.offeredPackageId);
    const target = remap(match.targetPackageId);

    if (offered === null || target === null) {
      return [];
    }

    const { counterOfferHistory, ...rest } = match;
    const previous = counterOfferHistory
      ? remap(counterOfferHistory.previousOfferedPackageId)
      : null;

    return [
      {
        ...rest,
        offeredPackageId: offered,
        targetPackageId: target,
        ...(counterOfferHistory && previous !== null
          ? {
              counterOfferHistory: {
                ...counterOfferHistory,
                previousOfferedPackageId: previous,
              },
            }
          : {}),
      },
    ];
  });

  return { ...state, packages, matches };
}

/**
 * Reads one slice of an external payload as a list, or `undefined` when the
 * value is not one.
 *
 * The types say `ProductPackage[]`, but the bytes come from another build,
 * another tab, or devtools, so the runtime value may be anything: `{ packages:
 * 42 }` used to throw inside `migratePersistedState`, and a slice that is not a
 * list has to read as absent so the caller keeps the slice it already has.
 */
function asList<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

/**
 * Parses a list entry by entry, keeping the entries the schema accepts.
 *
 * Returns `undefined` when the value is not a list, and also when it is one but
 * no entry inside it survives. Both read as "this payload carries nothing
 * usable for that slice", which is what lets the caller keep the list it
 * already has (broadcast) or fall back to the seeds (load): a state written
 * before a key existed, a slice sent as something else, and a slice where every
 * entry is unusable all land here, and none of them may empty a catalog.
 */
function parseExternalList<T>(
  schema: {
    safeParse: (
      value: unknown,
    ) => { success: true; data: T } | { success: false };
  },
  value: unknown,
): T[] | undefined {
  const entries = asList(value);

  if (!entries) {
    return undefined;
  }

  const survivors = entries.flatMap((entry) => {
    const parsed = schema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });

  return survivors.length > 0 ? survivors : undefined;
}

/**
 * Validates a payload that came from outside the store, after migration.
 *
 * Persisted bytes and broadcast messages are written by another build, another
 * tab, or a user with devtools open, so neither reaches the state before it
 * parses against the shared schemas: a stored match without
 * `deliveryConfirmation` used to pass the load path and then crash inside
 * `confirmDelivery`.
 *
 * An entry the schema rejects is dropped on its own. A live tab persists and
 * broadcasts the whole state, so a single unusable match used to take every
 * valid package down with it and reset the producer to the seed catalog. The
 * return is `null` only when neither slice is a list, which is what the caller
 * needs to tell a message to keep its own state (broadcast) from a load that
 * falls back to the seeds.
 */
function parseExternalState(
  state: Partial<BarterState>,
): Partial<BarterState> | null {
  const packages = parseExternalList(productPackageSchema, state.packages);
  const matches = parseExternalList(tradeMatchSchema, state.matches);

  if (packages === undefined && matches === undefined) {
    return null;
  }

  return { ...state, packages, matches };
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
 * Refuses a command on a match from a producer that is not one of its two
 * parties, and reports which side the caller is.
 *
 * Every transition that closes a match or moves stock is party-only. Each
 * caller used to carry its own copy of this check, which is how `reject` ended
 * up without one; the copies now share it.
 */
function assertProducerIsParty(
  match: TradeMatch,
  producerId: string,
): { isRequester: boolean; isTarget: boolean } {
  const isRequester = producerId === match.requesterId;
  const isTarget = producerId === match.targetProducerId;

  if (!isRequester && !isTarget) {
    throw new Error("Producer not party to this trade");
  }

  return { isRequester, isTarget };
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
        // A state written before a producer rename still carries the old ids,
        // and one written before the catalog still carries packages this build
        // cannot derive. Both are rewritten before validation, so a migrated id
        // is not mistaken for a malformed one and a retired package never
        // reaches the gondola again.
        persistedState =
          parseExternalState(
            keepOnlyCatalogPackages(migratePersistedState(JSON.parse(raw))),
          ) ?? {};
      }
    } catch {
      persistedState = {};
    }
  }

  // Producers this store runs with: explicit options win, and a persisted list is
  // merged into the catalog instead of replacing it.
  const producers =
    options.initialProducers ?? mergeCatalogProducers(persistedState.producers);

  // Initial producer resolution from query params (?producerId=...)
  // The default identity is pinned to the producer the app has always opened as,
  // so growing the seed list never silently changes who the screen starts as —
  // but only while that producer is actually in the list: an injected producer set
  // that omits it would otherwise start the store pointing at nobody.
  const defaultActiveId = producers.some(
    (producer) => producer.id === PRODUCER_IDS.VERMUT,
  )
    ? PRODUCER_IDS.VERMUT
    : producers[0]?.id;

  let initialActiveId = options.defaultActiveProducerId ?? defaultActiveId;
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
      options.initialPackages ?? mergeCatalogPackages(persistedState.packages),
    matches: options.initialMatches ?? persistedState.matches ?? [],
    activeProducerId: initialActiveId,
    papConfigArs: persistedState.papConfigArs ?? DEFAULT_PAP_VALUE_ARS,
    maxDistanceKm: undefined,
    productionTypeFilter: "ALL",
    producerFilterId: undefined,
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
        // A tab still running the previous bundle broadcasts the former ids,
        // and one from before the catalog broadcasts packages and trades this
        // build cannot derive. Both are rewritten before validation, so a peer
        // can neither resurrect a retired package nor hand over a trade with a
        // side that does not exist.
        const synced = keepOnlyCatalogPackages(
          migratePersistedState({ packages, matches, papConfigArs }),
        );
        const validated = parseExternalState(synced);

        // A message where neither slice carries anything readable is dropped
        // before it reaches the state (and it is never echoed back to the
        // peer).
        if (!validated) {
          return;
        }

        state = {
          ...state,
          packages: mergePeerPackages(state.packages, validated.packages),
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

    /**
     * Narrows the gondola to one producer's shelf. Local to this tab, like the
     * other two filters: it is how this user is looking at the gondola, not a fact
     * about the trade.
     */
    setProducerFilter: (producerId?: string) => {
      state = { ...state, producerFilterId: producerId };
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

    rejectTradeMatch: (matchId: string, producerId: string): TradeMatch => {
      const match = state.matches.find((m) => m.id === matchId);
      if (!match) throw new Error(`Match ${matchId} not found`);

      assertValidTransition(match.status, "REJECTED");
      assertProposalNotExpired(match);
      assertProducerIsParty(match, producerId);

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

      const { isRequester, isTarget } = assertProducerIsParty(
        match,
        producerId,
      );

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
      assertProducerIsParty(match, producerId);

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
