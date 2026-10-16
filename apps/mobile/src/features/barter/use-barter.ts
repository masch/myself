import { useSyncExternalStore } from "react";
import { globalBarterStore, type BarterState } from "./barter-store";
import { deriveGondolaPackages, type GondolaPackage } from "./barter-selectors";

/**
 * React hook to bind components directly to the BarterStore with zero tearing
 * and automatic reactivity across window tabs via BroadcastChannel.
 */
export function useBarter(): BarterState & {
  activeProducer: BarterState["producers"][number] | undefined;
  otherProducers: BarterState["producers"];
  activeProducerPackages: BarterState["packages"];
  gondolaPackages: GondolaPackage[];
  incomingMatches: BarterState["matches"];
  outgoingMatches: BarterState["matches"];
  setActiveProducer: (producerId: string) => void;
  setPapConfigArs: (papArs: number) => void;
  setMaxDistanceKm: (distanceKm?: number) => void;
  setProductionTypeFilter: (
    filter?: BarterState["productionTypeFilter"],
  ) => void;
  createTradeProposal: typeof globalBarterStore.createTradeProposal;
  acceptTradeMatch: typeof globalBarterStore.acceptTradeMatch;
  rejectTradeMatch: typeof globalBarterStore.rejectTradeMatch;
  counterOfferTradeMatch: typeof globalBarterStore.counterOfferTradeMatch;
  confirmDelivery: typeof globalBarterStore.confirmDelivery;
  cancelTradeMatch: typeof globalBarterStore.cancelTradeMatch;
  checkExpiredMatches: typeof globalBarterStore.checkExpiredMatches;
  resetToSeed: typeof globalBarterStore.resetToSeed;
} {
  const state = useSyncExternalStore(
    globalBarterStore.subscribe,
    globalBarterStore.getState,
    globalBarterStore.getState,
  );

  const activeProducer = state.producers.find(
    (p) => p.id === state.activeProducerId,
  );

  const otherProducers = state.producers.filter(
    (p) => p.id !== state.activeProducerId,
  );

  const activeProducerPackages = state.packages.filter(
    (p) => p.producerId === state.activeProducerId,
  );

  // Gondola contains only packages from OTHER producers, with distance and filter applied
  const gondolaPackages = deriveGondolaPackages(state);

  const incomingMatches = state.matches.filter(
    (m) => m.targetProducerId === state.activeProducerId,
  );

  const outgoingMatches = state.matches.filter(
    (m) => m.requesterId === state.activeProducerId,
  );

  return {
    ...state,
    activeProducer,
    otherProducers,
    activeProducerPackages,
    gondolaPackages,
    incomingMatches,
    outgoingMatches,
    setActiveProducer: globalBarterStore.setActiveProducer,
    setPapConfigArs: globalBarterStore.setPapConfigArs,
    setMaxDistanceKm: globalBarterStore.setMaxDistanceKm,
    setProductionTypeFilter: globalBarterStore.setProductionTypeFilter,
    createTradeProposal: globalBarterStore.createTradeProposal,
    acceptTradeMatch: globalBarterStore.acceptTradeMatch,
    rejectTradeMatch: globalBarterStore.rejectTradeMatch,
    counterOfferTradeMatch: globalBarterStore.counterOfferTradeMatch,
    confirmDelivery: globalBarterStore.confirmDelivery,
    cancelTradeMatch: globalBarterStore.cancelTradeMatch,
    checkExpiredMatches: globalBarterStore.checkExpiredMatches,
    resetToSeed: globalBarterStore.resetToSeed,
  };
}
