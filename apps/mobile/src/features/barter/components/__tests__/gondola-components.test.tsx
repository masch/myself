import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { PRODUCTION_TYPES, type ProductPackage } from "@myself/shared";
import { SEED_PACKAGES, SEED_PRODUCERS } from "../../barter-store";
import { FIXTURE_PACKAGES } from "../../__tests__/fixture-packages";
import { catalogPackages } from "../../catalog-packages";
import { PRIMAVERA_2026_PRODUCERS } from "../../producer-catalog";
import { ProductPackageCard } from "../product-package-card";
import {
  PackageOfferOption,
  resolveSelectedOffer,
} from "../trade-proposal-modal";
import {
  CARD_VARIANT_OPTIONS,
  GondolaFilterBar,
  TYPE_OPTIONS,
} from "../gondola-filter-bar";
import { CARD_VARIANTS, type CardVariant } from "../../card-variant";

/**
 * The catalog copy the gondola and the proposal modal show is presentational, so
 * it is pinned through `renderToString` instead of a renderer this repo does not
 * ship. The `Modal` shell portals its children and renders nothing on the
 * server, which is why the offer row is its own exported component.
 */

/**
 * The rendered text of a card, without React's node-boundary comments.
 *
 * The marker is React's own literal (`<!-- -->`), not a general comment: this is
 * a test helper reading our own component output, never a sanitizer for
 * untrusted input, and stripping the exact sequence is what keeps the assertion
 * honest about the text the card renders.
 */
function textOf(html: string): string {
  return html.replaceAll("<!-- -->", "");
}

function catalogPackage(id: string): ProductPackage {
  const found = catalogPackages().find((pkg) => pkg.id === id);

  if (!found) {
    throw new Error(`The catalog carries no package ${id}`);
  }

  return found;
}

function renderCard(
  pkg: ProductPackage,
  variant: CardVariant = "cantidad",
): string {
  const producer = PRIMAVERA_2026_PRODUCERS.find(
    (entry) => entry.id === pkg.producerId,
  );

  if (!producer) {
    throw new Error(`The seeded producers carry no ${pkg.producerId}`);
  }

  return textOf(
    renderToString(
      <ProductPackageCard
        packageItem={{ ...pkg, producer, distanceKm: 12 }}
        onProposeTrade={() => {}}
        variant={variant}
      />,
    ),
  );
}

function renderFilterBar(cardVariant: CardVariant): string {
  return textOf(
    renderToString(
      <GondolaFilterBar
        selectedType="ALL"
        onSelectType={() => {}}
        onSelectMaxDistance={() => {}}
        cardVariant={cardVariant}
        onSelectCardVariant={() => {}}
      />,
    ),
  );
}

/**
 * The opening tag of one layout chip, colours included.
 *
 * The selected and unselected chips differ only in the colours the chip puts on
 * the element that also carries its `testID`, so that tag is the whole difference
 * between the two states — no renderer needed to ask which chip is active.
 */
function chipMarkup(html: string, value: CardVariant): string {
  const marker = `data-testid="card-variant-${value}"`;
  const at = html.indexOf(marker);

  if (at === -1) throw new Error(`The filter bar renders no ${value} chip`);

  // The marker itself is what tells the chips apart by identity, so it is removed:
  // what is left is the colours each chip is drawn with.
  return html
    .slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1)
    .replace(` ${marker}`, "");
}

function renderOffer(pkg: ProductPackage): string {
  return textOf(
    renderToString(
      <PackageOfferOption
        ownPackage={pkg}
        isSelected={false}
        onSelect={() => {}}
      />,
    ),
  );
}

describe("Barter Gondola Component Logic", () => {
  it("formats PAP conversion badge correctly", () => {
    const papConfigArs = 50000;
    const formatted = `1 PAP = $${papConfigArs.toLocaleString("es-AR")} ARS`;
    expect(formatted).toContain("50.000");
  });

  it("calculates balance equivalence for proposed barter packages", () => {
    const vermut = SEED_PACKAGES[0];
    const queso = SEED_PACKAGES[2];

    expect(vermut.papValue).toBe(1);
    expect(queso.papValue).toBe(1);
    expect(vermut.papValue === queso.papValue).toBe(true);
  });

  it("identifies out-of-stock products for barter", () => {
    const inStock = { ...SEED_PACKAGES[0], stockUnits: 3 };
    const outOfStock = { ...SEED_PACKAGES[0], stockUnits: 0 };

    expect(inStock.stockUnits > 0).toBe(true);
    expect(outOfStock.stockUnits > 0).toBe(false);
  });

  it("filters gondola items by production type", () => {
    const packages = SEED_PACKAGES;
    const organicOnly = packages.filter((p) => p.productionType === "ORGANIC");
    const agroOnly = packages.filter(
      (p) => p.productionType === "AGROECOLOGICAL",
    );

    expect(organicOnly.length).toBeGreaterThan(0);
    expect(organicOnly.every((p) => p.productionType === "ORGANIC")).toBe(true);
    expect(agroOnly.every((p) => p.productionType === "AGROECOLOGICAL")).toBe(
      true,
    );
  });

  it("excludes packages from the active producer in gondola", () => {
    const activeProducerId = SEED_PRODUCERS[0].id;
    const gondola = SEED_PACKAGES.filter(
      (p) => p.producerId !== activeProducerId,
    );

    expect(gondola.every((p) => p.producerId !== activeProducerId)).toBe(true);
  });

  it("offers a gondola filter option for every production type", () => {
    const offered = TYPE_OPTIONS.map((option) => option.value);

    for (const productionType of PRODUCTION_TYPES) {
      expect(offered).toContain(productionType);
    }
  });
});

/**
 * The layout switch lives in the product filters, the surface that already answers
 * "how do I want to see the gondola?".
 */
describe("GondolaFilterBar offers the two card layouts", () => {
  it("renders one chip per layout, in the order the layouts live in", () => {
    const html = renderFilterBar("cantidad");

    expect(html).toContain("Ver card:");
    expect(html).toContain('data-testid="gondola-card-variant-row"');
    expect(CARD_VARIANT_OPTIONS.map((option) => option.value)).toEqual([
      ...CARD_VARIANTS,
    ]);
    expect(CARD_VARIANT_OPTIONS.map((option) => option.label)).toEqual([
      "Cantidad",
      "Ficha",
    ]);

    for (const option of CARD_VARIANT_OPTIONS) {
      expect(html).toContain(`data-testid="card-variant-${option.value}"`);
      expect(html).toContain(option.label);
    }

    // One chip each, never a duplicated row.
    expect(html.split('data-testid="card-variant-').length - 1).toBe(
      CARD_VARIANTS.length,
    );
  });

  it("marks the chip of the layout on screen as the selected one", () => {
    const cantidad = renderFilterBar("cantidad");
    const ficha = renderFilterBar("ficha");

    // The two chips never look alike, and picking the other layout swaps which
    // one carries the active colours.
    expect(chipMarkup(cantidad, "cantidad")).not.toBe(
      chipMarkup(cantidad, "ficha"),
    );
    expect(chipMarkup(ficha, "ficha")).toBe(chipMarkup(cantidad, "cantidad"));
    expect(chipMarkup(ficha, "cantidad")).toBe(chipMarkup(cantidad, "ficha"));
  });
});

describe("ProductPackageCard leads with what one PAP buys", () => {
  it("puts the quantity a user gets for 1 PAP in the largest type on the card", () => {
    // #1: nine half-litres are 4,5 litros, which is $1.741 short of one PAP.
    // The defect this replaces: `x 1/2 litro` was the headline while `4,5 litros`
    // sat in a caption, so nothing on the card answered the question it raises.
    const html = renderCard(catalogPackage("cat-1"));

    expect(html).toContain("4,5 litros");
    expect(html).toContain("POR 1 PAP");
    expect(html).toContain("Son 9 envases de 500 ml.");
    expect(html).toContain("El catálogo los cobra a $5.362,07 por 500 ml.");
    expect(html).toContain("Queda $1.741 abajo de 1 PAP");
  });

  it("lays the same facts out as label and value in the sheet layout", () => {
    const html = renderCard(catalogPackage("cat-1"), "ficha");

    expect(html).toContain("Te llevás por 1 PAP");
    expect(html).toContain("4,5 litros");
    expect(html).toContain("Cómo viene");
    expect(html).toContain("9 envases de 500 ml");
    expect(html).toContain("Ajuste a 1 PAP");
    expect(html).toContain("−$1.741");
    expect(html).toContain("$5.362,07 por 500 ml");
  });

  it("says a weighed package coincides exactly instead of naming a fraction", () => {
    // #5: Gouda at $22.158,20 por kg — the package is 2,26 kg, exactly 1 PAP.
    const html = renderCard(catalogPackage("cat-5"));

    expect(html).toContain("2,26 kg");
    expect(html).toContain("El catálogo lo cobra a $22.158,20 por kg.");
    expect(html).toContain("Coincide exacto con 1 PAP");
    expect(html).not.toContain("envases de");
  });

  it("never repeats the ARS value of one PAP inside a card", () => {
    // The anchor is one fact for the whole gondola and it already renders once, in
    // the list header. Repeating it per card is what the user asked to remove: a
    // constant the eye learns to skip, in the row where the variable number lives.
    for (const variant of CARD_VARIANTS) {
      expect(renderCard(catalogPackage("cat-1"), variant)).not.toContain(
        "50.000",
      );
    }
  });

  it("renders a package that carries no catalog block in both layouts", () => {
    // A state a build injects or a producer already stored can still carry a
    // package that predates the catalog block, so both layouts keep their copy.
    for (const variant of CARD_VARIANTS) {
      const html = renderCard(FIXTURE_PACKAGES[0], variant);

      expect(html).not.toContain("POR 1 PAP");
      expect(html).not.toContain("El catálogo");
      expect(html).not.toContain("Coincide exacto");
      expect(html).toContain("ENTREGÁS");
      expect(html).toContain("1 PAP");
      expect(html).toContain("Pedir Match");
    }
  });
});

describe("PackageOfferOption tells the producer what it hands over", () => {
  it("shows the quantity and the real PAP of a catalog package on offer", () => {
    // #1: nine half-litres are 4,5 litros, which is 0,97 PAP.
    const html = renderOffer(catalogPackage("cat-1"));

    expect(html).toContain("1 PAP ≈ 4,5 litros (9 × 500 ml) · real 0,97 PAP");
  });

  it("keeps the badge-only copy for a package without a catalog block", () => {
    const html = renderOffer(FIXTURE_PACKAGES[0]);

    expect(html).toContain("1 PAP");
    expect(html).not.toContain("PAP ≈");
    expect(html).not.toContain("real");
  });
});

describe("resolveSelectedOffer", () => {
  const offers = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("keeps the offer the operator picked while it still matches", () => {
    expect(resolveSelectedOffer(offers, "b")).toBe("b");
  });

  it("moves to the first offer still visible when the pick left the list", () => {
    expect(resolveSelectedOffer([{ id: "c" }], "b")).toBe("c");
  });

  it("selects nothing when the query matches nothing", () => {
    expect(resolveSelectedOffer([], "b")).toBe("");
  });
});
