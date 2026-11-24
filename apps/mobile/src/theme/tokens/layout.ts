import { spacing } from "./spacing";

/**
 * Design system layout tokens for standardized screen gutters, offsets, and card metrics.
 */
export const layout = {
  /**
   * Standard horizontal screen gutter for mobile views.
   * 12dp maximizes usable screen width for cards, controls, and reading text
   * while maintaining clean visual breathing room against device edges.
   */
  screenHorizontalPadding: spacing.compact, // 12
  screenTopOffset: spacing.sm, // 8
  screenBottomOffset: spacing.md, // 16
  cardGap: spacing.md, // 16
  cardPadding: spacing.compact, // 12
  /**
   * The accessible minimum touch target. Every control a finger must hit reads
   * this, so the reason lives here instead of trailing each call site.
   */
  minInteractiveTarget: 44,
  rowHeight: 44,
  /**
   * Compact control height: a dense entry point that sits inside a scrolled
   * header, where the list is the subject. It trades 4 points of touch area for
   * vertical rhythm, so reserve it for secondary controls, never for the one
   * action a screen exists for.
   */
  compactControlHeight: 40,
  rowPaddingVertical: 6,
  inputMinHeight: 44,
  inputMultilineMaxHeight: 110,
  rowLabelTopOffset: 11,
  iconSize: {
    xs: 10,
    sm: 16,
    md: 20,
    row: 22,
    lg: 24,
    xl: 32,
  },
} as const;

export type Layout = typeof layout;
