/**
 * 4-point spacing scale for mobile layouts.
 * Use with flexbox `gap` and container padding.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type Spacing = typeof spacing;
export type SpacingKey = keyof typeof spacing;
