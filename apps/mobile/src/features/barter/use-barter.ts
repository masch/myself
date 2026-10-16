import { useSyncExternalStore } from "react";
import { globalBarterStore, type BarterState } from "./barter-store";
import { calculateDistanceKm } from "./geo-utils";

/**
 * React hook to bind components directly to the BarterStore with zero tearing
 * and automatic reactivity across window tabs via BroadcastChannel.
 */
export function useBarter(): BarterState & {
  activeProducer: BarterState["producers"][number] | undefined;
  otherProducers: BarterState["producers"];
  activeProducerPackages: BarterState["packages"];
  gondolaPackages: Array<
    BarterState["packages"][number] & {
      producer: BarterState["producers"][number];
      distanceKm: number;
    }
  >;
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
  const gondolaPackages = state.packages
    .filter((p) => p.producerId !== state.activeProducerId)
    .filter((p) => {
      if (
        state.productionTypeFilter &&
        state.productionTypeFilter !== "ALL" &&
        p.productionType !== state.productionTypeFilter
      ) {
        return false;
      }
      return true;
    })
    .map((pkg) => {
      const producer = state.producers.find((p) => p.id === pkg.producerId)!;
      const distanceKm = activeProducer
        ? calculateDistanceKm(
            activeProducer.latitude,
            activeProducer.longitude,
            producer.latitude,
            producer.longitude,
          )
        : 0;
      return {
        ...pkg,
        producer,
        distanceKm,
      };
    })
    .filter((item) => {
      if (state.maxDistanceKm !== undefined && state.maxDistanceKm > 0) {
        return item.distanceKm <= state.maxDistanceKm;
      }
      return true;
    });

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
