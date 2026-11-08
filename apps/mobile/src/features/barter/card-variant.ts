/**
 * The two product-card layouts the gondola can render.
 *
 * They exist for one reason: the team is validating which hierarchy makes a card
 * understandable, and nobody has measured it yet. One layout leads with what the
 * package hands over for 1 PAP, the other lays the same facts out as a label/value
 * sheet — so the switch selects a presentation, never a behaviour.
 *
 * The values are words a person can read in a URL (`?card=ficha`), because the
 * selected layout travels in the gondola address: a tester can be handed a link
 * that opens the other layout instead of being asked to tap a chip first.
 */
export const CARD_VARIANTS = ["cantidad", "ficha"] as const;

export type CardVariant = (typeof CARD_VARIANTS)[number];

/**
 * The layout the gondola opens with.
 *
 * The quantity-first card is the default because it is the one that answers
 * "what do I get for 1 PAP?" without the user knowing what a PAP is worth yet;
 * the sheet is the alternative under test, not the baseline.
 */
export const DEFAULT_CARD_VARIANT: CardVariant = "cantidad";

/**
 * Narrows an untrusted value — a route parameter, a hand-typed URL, a link from a
 * newer build — to a layout.
 *
 * Unknown values fall back to the caller's default instead of throwing: a URL is
 * user input, and a mistyped `?card=algo` must not be able to crash the gondola.
 */
export function isCardVariant(value: unknown): value is CardVariant {
  return CARD_VARIANTS.includes(value as CardVariant);
}
