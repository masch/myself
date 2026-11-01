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

/**
 * Lowercase and accent-folded form of a searchable field.
 *
 * Searching is how an operator reaches one of 1531 gondola packages, and nobody
 * types the tilde into a search box: "dona mecha" has to find "Doña Mecha".
 */
function foldForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** What the gondola search reads from a row: the product and its producer. */
export interface GondolaSearchable {
  title: string;
  producer: { name: string };
}

/**
 * Narrows the gondola to what the operator typed.
 *
 * It matches the product title **and** the producer name, because an operator
 * remembers one or the other ("Vermut Rosso" or "Doña Mecha"), and it folds
 * case and accents on both sides.
 *
 * It takes the list the production-type and distance filters already built, so
 * the three filters narrow the same list instead of one replacing another.
 * Exported so the rule is testable without rendering: this repo has no component
 * renderer.
 */
/**
 * Narrows a list of packages to what the operator typed in its title.
 *
 * The proposal modal lists the active producer's own inventory (up to 77 printed
 * products), so it searches the same way the gondola does, without a producer
 * name to match against.
 */
export function filterPackagesByTitle<T extends { title: string }>(
  packages: T[],
  query: string,
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return packages;

  const needle = foldForSearch(trimmed);
  return packages.filter((pkg) => foldForSearch(pkg.title).includes(needle));
}

export function filterGondolaPackages<T extends GondolaSearchable>(
  packages: T[],
  query: string,
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return packages;

  const needle = foldForSearch(trimmed);

  return packages.filter(
    (pkg) =>
      foldForSearch(pkg.title).includes(needle) ||
      foldForSearch(pkg.producer.name).includes(needle),
  );
}
