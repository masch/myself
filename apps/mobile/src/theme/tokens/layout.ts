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
} as const;

export type Layout = typeof layout;
