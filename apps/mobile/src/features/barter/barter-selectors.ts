import type { BarterState } from "./barter-store";
import { calculateDistanceKm } from "./geo-utils";

/**
 * A package offered by another producer, with that producer already resolved
 * and the distance to the active producer measured.
 */
export type GondolaPackage = BarterState["packages"][number] & {
  producer: BarterState["producers"][number];
  distanceKm: number;
};

/**
 * Builds the gondola: packages from the other producers, with the production
 * type and max distance filters applied.
 */
export function deriveGondolaPackages(state: BarterState): GondolaPackage[] {
  const activeProducer = state.producers.find(
    (p) => p.id === state.activeProducerId,
  );

  return state.packages
    .filter((pkg) => pkg.producerId !== state.activeProducerId)
    .filter((pkg) => {
      if (
        state.productionTypeFilter &&
        state.productionTypeFilter !== "ALL" &&
        pkg.productionType !== state.productionTypeFilter
      ) {
        return false;
      }
      return true;
    })
    .flatMap((pkg) => {
      const producer = state.producers.find((p) => p.id === pkg.producerId);

      // A hydrated localStorage state or a cross-tab broadcast can carry
      // packages seeded by a build whose producers no longer exist. Skipping
      // them keeps the screen alive instead of crashing on `producer.latitude`.
      if (!producer) {
        return [];
      }

      const distanceKm = activeProducer
        ? calculateDistanceKm(
            activeProducer.latitude,
            activeProducer.longitude,
            producer.latitude,
            producer.longitude,
          )
        : 0;

      return [
        {
          ...pkg,
          producer,
          distanceKm,
        },
      ];
    })
    .filter((item) => {
      if (state.maxDistanceKm !== undefined && state.maxDistanceKm > 0) {
        return item.distanceKm <= state.maxDistanceKm;
      }
      return true;
    });
}
