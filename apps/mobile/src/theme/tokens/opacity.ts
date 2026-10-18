/**
 * Interaction opacity tokens so component styles reference tokens instead of
 * repeating literals for press and disabled feedback.
 */
export const opacities = {
  /** Pressed state for tappable rows, links and controls. */
  pressed: 0.6,
} as const;

export type Opacities = typeof opacities;
