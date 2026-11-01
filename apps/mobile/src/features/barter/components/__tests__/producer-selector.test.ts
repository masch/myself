import { describe, expect, it } from "bun:test";
import type { Producer } from "@myself/shared";
import { filterProducers } from "../producer-header-switcher";

/**
 * The identity switcher shows 158 producers, so the search box is the only way
 * to find one. The rule it applies lives in `filterProducers` and is pinned
 * here without rendering anything.
 */

function producer(id: string, name: string, address: string): Producer {
  return {
    id,
    name,
    address,
    latitude: -31.6333,
    longitude: -60.7,
    productionType: "AGROECOLOGICAL",
    phone: "+543510000000",
  };
}

const catalog: Producer[] = [
  producer("sabado", "Vermut Sabado", "Chacra Alimento, Umepay"),
  producer("naturaleza-viva", "Naturaleza Viva", "Santa Fe"),
  producer("dona-mecha", "Doña Mecha", "Arroyo Leyes, Santa Fe"),
  producer("la-espiga", "La Espiga", "Chascomús, Buenos Aires"),
];

const namesOf = (producers: Producer[]) => producers.map((p) => p.name);

describe("filterProducers", () => {
  it("returns every producer in catalog order when the query is empty", () => {
    expect(namesOf(filterProducers(catalog, ""))).toEqual([
      "Vermut Sabado",
      "Naturaleza Viva",
      "Doña Mecha",
      "La Espiga",
    ]);
    // A whitespace-only query is still no query.
    expect(namesOf(filterProducers(catalog, "   "))).toEqual(namesOf(catalog));
  });

  it("matches a name substring case-insensitively", () => {
    expect(namesOf(filterProducers(catalog, "mecha"))).toEqual(["Doña Mecha"]);
    expect(namesOf(filterProducers(catalog, "VERMUT"))).toEqual([
      "Vermut Sabado",
    ]);
  });

  it("matches an address substring, not only a name", () => {
    expect(namesOf(filterProducers(catalog, "chascomús"))).toEqual([
      "La Espiga",
    ]);
    // "Santa Fe" is printed in two addresses and no name.
    expect(namesOf(filterProducers(catalog, "santa fe"))).toEqual([
      "Naturaleza Viva",
      "Doña Mecha",
    ]);
  });

  it("finds an accented producer typed without its accents", () => {
    // Nobody types the tilde into a search box: the catalog is full of "Doña",
    // "Quillén" and "Chascomús", so the match folds accents on both sides.
    expect(namesOf(filterProducers(catalog, "dona mecha"))).toEqual([
      "Doña Mecha",
    ]);
    expect(namesOf(filterProducers(catalog, "chascomus"))).toEqual([
      "La Espiga",
    ]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterProducers(catalog, "productor inexistente")).toEqual([]);
  });
});
