/**
 * Interaction opacity tokens so component styles reference tokens instead of
 * repeating literals for press and disabled feedback.
 */
export const opacities = {
  /** Pressed state for tappable rows, links and controls. */
  pressed: 0.6,
  /** Softer pressed state that keeps more of the row content visible. */
  pressedSoft: 0.7,
  /** Completed or already-read items that are de-emphasized. */
  completed: 0.9,
  /** Disabled controls and unavailable options. */
  disabled: 0.4,
} as const;

export type Opacities = typeof opacities;
