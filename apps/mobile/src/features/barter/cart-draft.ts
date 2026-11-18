import type { TradeLine } from "@myself/shared";

/**
 * The cart the proposal modal builds before the store validates it: one
 * draft per side, edited by steppers.
 */
export interface CartDraft {
  lines: TradeLine[];
}

/** The smallest cart slice the draft needs: id plus the real stock. */
export interface CartPackageRef {
  id: string;
  stockUnits: number;
}

/**
 * Adds a package to the cart, or does nothing when it is already a line —
 * the stepper edits the units of the line that exists.
 */
export function addCartLine(draft: CartDraft, pkg: CartPackageRef): CartDraft {
  if (draft.lines.some((line) => line.packageId === pkg.id)) {
    return draft;
  }
  return { lines: [...draft.lines, { packageId: pkg.id, units: 1 }] };
}

/**
 * Moves one line's units into the stepper's bounds: 1..stock. The line stays
 * in the cart — removing it is the separate remove action, never a stepper
 * accident at 0.
 */
export function setCartLineUnits(
  draft: CartDraft,
  packageId: string,
  units: number,
  stock: number,
): CartDraft {
  return {
    lines: draft.lines.map((line) =>
      line.packageId === packageId
        ? { ...line, units: Math.min(Math.max(units, 1), Math.max(stock, 1)) }
        : line,
    ),
  };
}

/** Drops one line from the cart. */
export function removeCartLine(draft: CartDraft, packageId: string): CartDraft {
  return {
    lines: draft.lines.filter((line) => line.packageId !== packageId),
  };
}

/**
 * The visible PAP total of one side. Every package is exactly 1 PAP, so the
 * total is counting units — the balance rule in its user-facing form.
 */
export function cartTotal(draft: CartDraft): number {
  return draft.lines.reduce((total, line) => total + line.units, 0);
}

/**
 * Why the cart cannot be sent yet, or null when it can.
 *
 * The messages are the ones the store enforces, so the button's disable
 * reason and the store's rejection can never disagree.
 */
export function cartBalanceError(
  offered: CartDraft,
  target: CartDraft,
): string | null {
  if (offered.lines.length === 0 || target.lines.length === 0) {
    return "Elegí al menos un producto de cada lado del trueque";
  }
  const offeredTotal = cartTotal(offered);
  const targetTotal = cartTotal(target);
  if (offeredTotal !== targetTotal) {
    return "Los dos lados deben sumar la misma cantidad de PAP";
  }
  return null;
}

/**
 * The copy a counter-offer shows about its own change of total (rules 7-8 of
 * issue #162): the re-check reads the delta before accepting.
 */
export function counterDeltaCopy(
  previousTotal: number,
  counterTotal: number,
): string {
  if (counterTotal < previousTotal) {
    return `Bajaste el trueque: propusiste ${previousTotal} ↔ ${previousTotal}, la contraoferta es ${counterTotal} ↔ ${counterTotal}.`;
  }
  if (counterTotal > previousTotal) {
    return `Subiste el trueque: propusiste ${previousTotal} ↔ ${previousTotal}, la contraoferta es ${counterTotal} ↔ ${counterTotal}.`;
  }
  return `Mismo total: propusiste ${previousTotal} ↔ ${previousTotal}, la contraoferta cambia la composición.`;
}

/**
 * The one-line description of one cart side: "Título ×N · Título ×N". Used by
 * match cards, the inbox and the delivery screen so every surface reads the
 * same carts the same way.
 */
export function describeCartSide(
  lines: { packageId: string; units: number }[],
  packages: { id: string; title: string }[],
): string {
  if (lines.length === 0) return "Carrito vacío";
  return lines
    .map((line) => {
      const title = packages.find((p) => p.id === line.packageId)?.title;
      return `${title ?? line.packageId} ×${line.units}`;
    })
    .join(" · ");
}
