import { describe, expect, it } from "bun:test";
import {
  buildGondolaParams,
  gondolaViewKey,
  parseGondolaParams,
  type GondolaViewState,
} from "../gondola-params";
import { DEFAULT_CARD_VARIANT } from "../card-variant";

/**
 * The gondola view travels in the URL so a shared address reproduces the page and
 * the browser back button reverts a search. These pins hold the two directions
 * together: anything the screen writes, the URL has to read back the same.
 */
const DEFAULTS: GondolaViewState = {
  query: "",
  productionType: "ALL",
  maxDistanceKm: undefined,
  cardVariant: DEFAULT_CARD_VARIANT,
};

describe("parseGondolaParams", () => {
  it("reads a full gondola view out of the URL", () => {
    expect(
      parseGondolaParams({ q: "queso", tipo: "ORGANIC", km: "250" }, DEFAULTS),
    ).toEqual({
      query: "queso",
      productionType: "ORGANIC",
      maxDistanceKm: 250,
      cardVariant: "cantidad",
    });
  });

  it("keeps the screen's own values when the URL says nothing", () => {
    const persisted: GondolaViewState = {
      query: "miel",
      productionType: "AGROECOLOGICAL",
      maxDistanceKm: 50,
      cardVariant: "ficha",
    };

    expect(parseGondolaParams({}, persisted)).toEqual(persisted);
  });

  it("treats a certification the URL omits as Todos once the URL speaks about the gondola", () => {
    // Clearing a filter removes the parameter, so reading absence as "whatever the
    // screen had at mount" is what made back and forward bring the filter back.
    expect(
      parseGondolaParams(
        { q: "queso" },
        { ...DEFAULTS, productionType: "ORGANIC", maxDistanceKm: 250 },
      ),
    ).toEqual({
      query: "queso",
      productionType: "ALL",
      maxDistanceKm: undefined,
      cardVariant: "cantidad",
    });
  });

  it("treats an unknown certification as absent instead of throwing", () => {
    expect(
      parseGondolaParams({ tipo: "ORGANICOO" }, DEFAULTS).productionType,
    ).toBe("ALL");
  });

  it("accepts ALL as an explicit clear of the certification filter", () => {
    expect(
      parseGondolaParams(
        { tipo: "ALL" },
        { ...DEFAULTS, productionType: "VEGAN" },
      ).productionType,
    ).toBe("ALL");
  });

  it("accepts a distance a newer build might have written, not only the offered chips", () => {
    expect(parseGondolaParams({ km: "120" }, DEFAULTS).maxDistanceKm).toBe(120);
  });

  it("ignores a distance that is not a positive number", () => {
    for (const km of ["0", "-5", "abc", ""]) {
      expect(
        parseGondolaParams({ km }, DEFAULTS).maxDistanceKm,
      ).toBeUndefined();
    }
  });

  it("takes the first value when a parameter arrives repeated", () => {
    expect(parseGondolaParams({ q: ["queso", "miel"] }, DEFAULTS).query).toBe(
      "queso",
    );
  });
});

/**
 * The layout is part of the gondola view, not a component flag: the selected card
 * travels in the address so a validation user can be handed `?card=ficha`.
 */
describe("the layout in the gondola address", () => {
  const persisted: GondolaViewState = {
    query: "miel",
    productionType: "ORGANIC",
    maxDistanceKm: 250,
    cardVariant: "ficha",
  };

  it("treats an address that only carries the layout as speaking about the gondola", () => {
    // A shared `?card=ficha` carries no filter at all. If it did not count as a
    // gondola view, the link would be ignored and the layout would never change.
    expect(parseGondolaParams({ card: "ficha" }, persisted)).toEqual({
      query: "",
      productionType: "ALL",
      maxDistanceKm: undefined,
      cardVariant: "ficha",
    });
  });

  it("falls back to the quantity layout when the address omits, empties or invents one", () => {
    for (const card of [undefined, "", "algo"]) {
      expect(
        parseGondolaParams({ q: "queso", card }, persisted).cardVariant,
      ).toBe("cantidad");
    }
  });

  it("keeps the default URL free of the layout parameter", () => {
    expect(buildGondolaParams(DEFAULTS).card).toBeUndefined();
  });

  it("writes the sheet layout once the user picks it", () => {
    expect(buildGondolaParams({ ...DEFAULTS, cardVariant: "ficha" }).card).toBe(
      "ficha",
    );
  });

  it("tells two layouts of the same gondola apart", () => {
    expect(gondolaViewKey({ ...DEFAULTS, cardVariant: "ficha" })).not.toBe(
      gondolaViewKey(DEFAULTS),
    );
  });
});

describe("buildGondolaParams", () => {
  it("writes nothing for an unfiltered gondola", () => {
    expect(buildGondolaParams(DEFAULTS)).toEqual({
      q: undefined,
      tipo: undefined,
      km: undefined,
      card: undefined,
      producerId: undefined,
    });
  });

  it("writes the certification, the distance and the producer when they exist", () => {
    expect(
      buildGondolaParams(
        {
          ...DEFAULTS,
          query: "queso",
          productionType: "ORGANIC",
          maxDistanceKm: 250,
        },
        "sabado",
      ),
    ).toEqual({
      q: "queso",
      tipo: "ORGANIC",
      km: "250",
      card: undefined,
      producerId: "sabado",
    });
  });

  it("trims a query that is only whitespace out of the URL", () => {
    expect(buildGondolaParams({ ...DEFAULTS, query: "   " }).q).toBeUndefined();
  });

  it("never writes the ALL filter", () => {
    expect(
      buildGondolaParams({ ...DEFAULTS, productionType: "ALL" }).tipo,
    ).toBeUndefined();
  });

  it("does not write a zero or negative distance", () => {
    expect(buildGondolaParams({ ...DEFAULTS, maxDistanceKm: 0 }).km).toBe(
      undefined,
    );
    expect(buildGondolaParams({ ...DEFAULTS, maxDistanceKm: -50 }).km).toBe(
      undefined,
    );
  });

  it("round-trips through the URL", () => {
    const state: GondolaViewState = {
      query: "queso",
      productionType: "BIODYNAMIC",
      maxDistanceKm: 800,
      cardVariant: "ficha",
    };
    const params = buildGondolaParams(state, "sabado");
    const url = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined) as [
        string,
        string,
      ][],
    );

    expect(parseGondolaParams(Object.fromEntries(url), DEFAULTS)).toEqual(
      state,
    );
  });
});

describe("gondolaViewKey", () => {
  it("is order independent", () => {
    const a = gondolaViewKey(
      {
        query: "queso",
        productionType: "ORGANIC",
        maxDistanceKm: 250,
        cardVariant: "cantidad",
      },
      "sabado",
    );
    const b = gondolaViewKey(
      {
        maxDistanceKm: 250,
        cardVariant: "cantidad",
        productionType: "ORGANIC",
        query: "queso",
      },
      "sabado",
    );

    expect(a).toBe(b);
    expect(a).toBe("km=250&producerId=sabado&q=queso&tipo=ORGANIC");
  });

  it("treats an unfiltered gondola and a whitespace query as the same view", () => {
    expect(gondolaViewKey({ ...DEFAULTS, query: "  " })).toBe(
      gondolaViewKey(DEFAULTS),
    );
  });

  it("changes when any part of the view changes", () => {
    const base = gondolaViewKey(DEFAULTS);

    expect(gondolaViewKey({ ...DEFAULTS, query: "queso" })).not.toBe(base);
    expect(gondolaViewKey({ ...DEFAULTS, productionType: "ORGANIC" })).not.toBe(
      base,
    );
    expect(gondolaViewKey({ ...DEFAULTS, maxDistanceKm: 50 })).not.toBe(base);
    expect(gondolaViewKey(DEFAULTS, "sabado")).not.toBe(base);
  });
});
