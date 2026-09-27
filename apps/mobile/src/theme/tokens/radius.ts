/**
 * Corner radius tokens for rounded surfaces, cards, and capsules.
 * Non-capsule surfaces should pair with `borderCurve: "continuous"`.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export type Radius = typeof radius;
export type RadiusKey = keyof typeof radius;
