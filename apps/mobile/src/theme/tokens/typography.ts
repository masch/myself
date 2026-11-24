import type { TextStyle } from "react-native";

/**
 * Compact typography scale derived from the Apple Human Interface Guidelines
 * and Material Design 3 type scales. It keeps the same eight-step hierarchy but
 * runs one notch denser than the reference scales so dense screens (catalog,
 * barter, forms) show more content without losing rank. Every variant pairs
 * fontSize, lineHeight, and fontWeight.
 */
export const typography = {
  largeTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
  },
  title1: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "700",
  },
  title2: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "600",
  },
  headline: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
  },
  callout: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
  },
  caption1: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "400",
  },
  caption2: {
    fontSize: 10,
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
 * the typography variants. Keep it in step with `typography` so mixed text on
 * one screen never jumps: `lg` ~ title2, `md` ~ headline/body, `sm` ~ callout,
 * `xs` ~ caption1.
 */
export const fontSizes = {
  xs: 10,
  sm: 13,
  md: 14,
  lg: 17,
} as const;

/**
 * Shared line-height scale paired with `fontSizes` for component styles that
 * override a variant's leading. Each step keeps roughly a 1.2–1.3 ratio with
 * its matching `fontSizes` entry.
 */
export const lineHeights = {
  xs: 16,
  sm: 18,
  md: 19,
  lg: 20,
  xl: 22,
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
