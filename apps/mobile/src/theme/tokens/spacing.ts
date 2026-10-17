/**
 * Spacing scale for mobile layouts. Built on 4-point steps, with a single 2px
 * minimum step (`xxs`) for hairline gaps.
 * Use with flexbox `gap` and container padding.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  compact: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type Spacing = typeof spacing;
export type SpacingKey = keyof typeof spacing;
