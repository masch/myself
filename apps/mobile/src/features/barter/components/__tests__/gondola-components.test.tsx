import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { PRODUCTION_TYPES, type ProductPackage } from "@myself/shared";
import { SEED_PACKAGES, SEED_PRODUCERS } from "../../barter-store";
import { catalogPackages } from "../../catalog-packages";
import { PRIMAVERA_2026_PRODUCERS } from "../../producer-catalog";
import { ProductPackageCard } from "../product-package-card";
import {
  PackageOfferOption,
  resolveSelectedOffer,
} from "../trade-proposal-modal";
import { TYPE_OPTIONS } from "../gondola-filter-bar";

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

function renderCard(pkg: ProductPackage): string {
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
      />,
    ),
  );
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

describe("ProductPackageCard carries the printed price and the PAP fraction", () => {
  it("discloses what the PDF charges for one printed presentation", () => {
    // #890: Vermut Rosso x 750 ml, $13.970 la botella; four bottles are 1,1176
    // PAP, so the card says both numbers instead of hiding the fraction.
    const html = renderCard(catalogPackage("cat-890"));

    expect(html).toContain("Precio de lista: $13.970,00 por 750 ml");
    expect(html).toContain("1 PAP ≈ 3 litros (4 × 750 ml) · real 1,12 PAP");
  });

  it("discloses a weighed product without a presentation parenthetical", () => {
    // #5: Gouda at $22.158,20 por kg — the package is 2,26 kg, exactly 1 PAP.
    const html = renderCard(catalogPackage("cat-5"));

    expect(html).toContain("Precio de lista: $22.158,20 por kg");
    expect(html).toContain("1 PAP ≈ 2,26 kg · real 1,00 PAP");
  });

  it("adds neither line to a package that carries no catalog block", () => {
    // The four POC packages are a persisted contract and the catalog does not
    // print them, so they keep exactly the copy they had.
    const html = renderCard(SEED_PACKAGES[0]);

    expect(html).not.toContain("Precio de lista");
    expect(html).not.toContain("PAP ≈");
    expect(html).toContain("Valor: $50.000 ARS");
  });
});

describe("PackageOfferOption tells the producer what it hands over", () => {
  it("shows the quantity and the real PAP of a catalog package on offer", () => {
    // #1: nine half-litres are 4,5 litros, which is 0,97 PAP.
    const html = renderOffer(catalogPackage("cat-1"));

    expect(html).toContain("1 PAP ≈ 4,5 litros (9 × 500 ml) · real 0,97 PAP");
  });

  it("keeps the badge-only copy for a package without a catalog block", () => {
    const html = renderOffer(SEED_PACKAGES[0]);

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
