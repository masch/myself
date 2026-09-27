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

export type Typography = typeof typography;
export type TypographyVariant = keyof typeof typography;
