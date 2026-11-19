import { describe, expect, it } from "bun:test";
import {
  addCartLine,
  setCartLineUnits,
  cartTotal,
  cartBalanceError,
  type CartDraft,
} from "../cart-draft";
import { counterDeltaCopy, describeCartSide } from "../cart-draft";

const ROSSO = { id: "direct-vermut-rosso-750", stockUnits: 5 } as const;
const BLANCO = { id: "direct-vermut-blanco-750", stockUnits: 2 } as const;

describe("cart draft (issue #162 cart UI)", () => {
  it("adds a line for a package not in the cart yet, defaulting to 1 unit", () => {
    const draft: CartDraft = { lines: [] };
    const next = addCartLine(draft, ROSSO);
    expect(next.lines).toEqual([{ packageId: ROSSO.id, units: 1 }]);
    // Pure update: the previous draft stays untouched.
    expect(draft.lines).toEqual([]);
  });

  it("adds a second distinct package as its own line", () => {
    let draft: CartDraft = { lines: [] };
    draft = addCartLine(draft, ROSSO);
    draft = addCartLine(draft, BLANCO);
    expect(draft.lines).toEqual([
      { packageId: ROSSO.id, units: 1 },
      { packageId: BLANCO.id, units: 1 },
    ]);
  });

  it("clamps the stepper at the package's available stock and at 1", () => {
    const draft: CartDraft = { lines: [{ packageId: ROSSO.id, units: 2 }] };
    expect(
      setCartLineUnits(draft, ROSSO.id, 6, ROSSO.stockUnits).lines[0]?.units,
    ).toBe(5);
    expect(
      setCartLineUnits(draft, ROSSO.id, 0, ROSSO.stockUnits).lines[0]?.units,
    ).toBe(1);
  });

  it("removes a line when its units drop below 1 through removeCartLine", () => {
    const draft: CartDraft = {
      lines: [
        { packageId: ROSSO.id, units: 2 },
        { packageId: BLANCO.id, units: 1 },
      ],
    };
    expect(cartTotal(draft)).toBe(3);
  });

  it("totals count units across lines", () => {
    const draft: CartDraft = {
      lines: [
        { packageId: ROSSO.id, units: 2 },
        { packageId: BLANCO.id, units: 1 },
      ],
    };
    expect(cartTotal(draft)).toBe(3);
  });

  it("rejects an unbalanced cart with the symmetry message", () => {
    expect(
      cartBalanceError(
        { lines: [{ packageId: ROSSO.id, units: 3 }] },
        { lines: [{ packageId: BLANCO.id, units: 2 }] },
      ),
    ).toBe("Los dos lados deben sumar la misma cantidad de PAP");
  });

  it("rejects an empty cart", () => {
    expect(cartBalanceError({ lines: [] }, { lines: [] })).toMatch(/al menos/i);
  });

  it("accepts a balanced non-empty cart", () => {
    expect(
      cartBalanceError(
        { lines: [{ packageId: ROSSO.id, units: 3 }] },
        { lines: [{ packageId: BLANCO.id, units: 3 }] },
      ),
    ).toBeNull();
  });
});

describe("counter-offer delta copy", () => {
  it("describes a lower counter-offer", () => {
    expect(counterDeltaCopy(3, 2)).toBe(
      "Bajaste el trueque: propusiste 3 ↔ 3, la contraoferta es 2 ↔ 2.",
    );
  });

  it("describes a higher counter-offer", () => {
    expect(counterDeltaCopy(3, 4)).toBe(
      "Subiste el trueque: propusiste 3 ↔ 3, la contraoferta es 4 ↔ 4.",
    );
  });

  it("describes a same-total composition change", () => {
    expect(counterDeltaCopy(3, 3)).toBe(
      "Mismo total: propusiste 3 ↔ 3, la contraoferta cambia la composición.",
    );
  });
});

describe("cart side description", () => {
  const packages = [
    { id: "a", title: "Vermut Rosso 750" },
    { id: "b", title: "Queso Gouda" },
  ] as Parameters<typeof describeCartSide>[1];

  it("describes one line with its units", () => {
    expect(describeCartSide([{ packageId: "a", units: 3 }], packages)).toBe(
      "Vermut Rosso 750 ×3",
    );
  });

  it("joins mixed lines", () => {
    expect(
      describeCartSide(
        [
          { packageId: "a", units: 2 },
          { packageId: "b", units: 1 },
        ],
        packages,
      ),
    ).toBe("Vermut Rosso 750 ×2 · Queso Gouda ×1");
  });

  it("falls back to the package id when the catalog does not carry it", () => {
    expect(describeCartSide([{ packageId: "ghost", units: 1 }], packages)).toBe(
      "ghost ×1",
    );
  });

  it("marks an empty side as unavailable", () => {
    expect(describeCartSide([], packages)).toBe("Carrito vacío");
  });
});
