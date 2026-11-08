import type { ProductPackage } from "@myself/shared";
import { PRODUCER_IDS } from "../barter-store";

/**
 * The barter fixtures: four packages of a known producer, price, PAP value and
 * stock, so a guard test never depends on what the printed catalog derives.
 *
 * They are deliberately **not** seed data. The gondola is catalog-only, and the
 * app no longer ships a handwritten package. Two things still need one:
 *
 * - the store guards, which ask who owns a package and whether the two sides are
 *   worth the same PAP — questions whose answers must not move when the printed
 *   catalog is retranscribed;
 * - the card, which still renders a package that carries no `catalog` block,
 *   because a persisted or injected state may carry one.
 *
 * The ids are not the retired `pkg-*` ones on purpose: a persisted state naming a
 * retired id is purged on load, so a fixture reusing one would silently test the
 * purge instead of its own subject.
 */
export const FIXTURE_PACKAGES: ProductPackage[] = [
  {
    id: "pkg-fixture-vermut-pack4",
    producerId: PRODUCER_IDS.VERMUT,
    title: "Pack 4 Botellas Vermut Rosso 750ml",
    productionType: "AGROECOLOGICAL",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 6,
  },
  {
    id: "pkg-fixture-vermut-miel",
    producerId: PRODUCER_IDS.VERMUT,
    title: "Miel Multiflora de Chacra 1kg",
    productionType: "AGROECOLOGICAL",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 4,
  },
  {
    id: "pkg-fixture-queso-gouda",
    producerId: PRODUCER_IDS.QUESO,
    title: "Horma 2kg Queso Gouda Agroecológico",
    productionType: "ORGANIC",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 5,
  },
  {
    id: "pkg-fixture-queso-provoleta",
    producerId: PRODUCER_IDS.QUESO,
    title: "Pack 6 Provoletas Estacionadas",
    productionType: "ORGANIC",
    priceArs: 50000,
    papValue: 1,
    stockUnits: 3,
  },
];

/** The one fixture of a product, so a test never indexes into the list. */
export function fixturePackage(id: string): ProductPackage {
  const found = FIXTURE_PACKAGES.find((pkg) => pkg.id === id);

  if (!found) {
    throw new Error(`The fixtures carry no ${id}`);
  }

  return found;
}
