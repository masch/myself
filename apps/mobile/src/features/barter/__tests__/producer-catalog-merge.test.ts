import { describe, expect, it } from "bun:test";
import type { Producer } from "@myself/shared";
import {
  PRODUCER_IDS,
  SEED_PRODUCERS,
  mergeCatalogProducers,
} from "../barter-store";

/**
 * A state persisted by a build with a shorter catalog must never hide the
 * producers this build ships: the printed catalog is the base, and whatever the
 * stored state carries is merged into it.
 */

function producer(id: string, name: string): Producer {
  return {
    id,
    name,
    productionType: "AGROECOLOGICAL",
    address: "Santa Fe",
    latitude: -31.6333,
    longitude: -60.7,
    phone: "+543510000000",
  };
}

describe("mergeCatalogProducers", () => {
  it("returns the seeded catalog when the state carries no producers", () => {
    expect(mergeCatalogProducers()).toEqual(SEED_PRODUCERS);
    expect(mergeCatalogProducers([])).toEqual(SEED_PRODUCERS);
  });

  it("keeps the whole catalog when the state carries the pre-catalog list", () => {
    const preCatalog = [
      producer(PRODUCER_IDS.VERMUT, "Vermut Sabado"),
      producer(PRODUCER_IDS.QUESO, "Naturaleza Viva"),
      producer("granja-nova", "Granja Nova"),
    ];

    const merged = mergeCatalogProducers(preCatalog);

    expect(merged).toHaveLength(SEED_PRODUCERS.length);
    expect(merged.map((entry) => entry.id)).toEqual(
      SEED_PRODUCERS.map((entry) => entry.id),
    );
  });

  it("keeps a persisted producer the catalog does not carry, after the catalog", () => {
    const merged = mergeCatalogProducers([
      producer("productor-que-ya-no-esta", "Productor histórico"),
      producer(PRODUCER_IDS.QUESO, "Naturaleza Viva"),
    ]);

    expect(merged).toHaveLength(SEED_PRODUCERS.length + 1);
    expect(merged.at(-1)?.id).toBe("productor-que-ya-no-esta");
    // The catalog keeps its printed order: the extra producer goes last.
    expect(merged.slice(0, SEED_PRODUCERS.length)).toEqual(SEED_PRODUCERS);
  });

  it("lets the catalog win on a shared id instead of duplicating it", () => {
    const stale = {
      ...producer(PRODUCER_IDS.QUESO, "Nombre viejo"),
      latitude: 0,
    };

    const merged = mergeCatalogProducers([stale]);
    const matched = merged.filter((entry) => entry.id === PRODUCER_IDS.QUESO);
    const [only, ...rest] = matched;
    const curated = SEED_PRODUCERS.find(
      (entry) => entry.id === PRODUCER_IDS.QUESO,
    );

    expect(rest).toHaveLength(0);

    if (!only || !curated) {
      throw new Error("Both the merged and the curated producer must exist");
    }

    expect(only.name).toBe(curated.name);
    // The stale coordinates lose to the curated entry, not the other way round.
    expect(only.latitude).toBe(curated.latitude);
  });
});
