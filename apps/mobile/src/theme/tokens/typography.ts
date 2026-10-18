import type { TextStyle } from "react-native";

/**
 * Platform-aligned typography scale matching Apple Human Interface Guidelines
 * and Material Design 3 type scales. Every variant pairs fontSize, lineHeight,
 * and fontWeight.
 */
export const typography = {
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "700",
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "600",
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "400",
  },
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  caption2: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "400",
  },
} as const satisfies Record<string, TextStyle>;

/**
 * Shared numeric font-weight scale so component styles reference tokens instead
 * of repeating string literals.
 */
export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  heavy: "800",
} as const;

/**
 * Shared numeric font-size scale for component styles that need a size outside
 * the typography variants. Keep each value equal to the pixel size it replaces.
 */
export const fontSizes = {
  xs: 11,
  sm: 14,
  md: 16,
  lg: 19,
} as const;

/**
 * Shared line-height scale paired with `fontSizes` for component styles that
 * override a variant's leading. Keep each value equal to the point size it
 * replaces.
 */
export const lineHeights = {
  xs: 18,
  sm: 20,
  md: 21,
  lg: 22,
  xl: 25,
} as const;

/**
 * Shared letter-spacing scale so component styles reference tokens instead of
 * repeating literals. `caption` tracks the uppercase micro headers used above
 * card and section titles.
 */
export const letterSpacings = {
  caption: 0.5,
  /** Emphasized card titles. */
  title: 0.3,
  /** Long-form verse and prose. */
  body: 0.2,
} as const;

export type Typography = typeof typography;
export type TypographyVariant = keyof typeof typography;
