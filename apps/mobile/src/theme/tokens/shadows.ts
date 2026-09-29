/**
 * Elevation presets using standard `boxShadow` strings.
 * Compatible across React Native 0.76+ / Expo SDK 52+ new architecture and Web.
 */
export const shadows = {
  card: "0 1px 2px rgba(0, 0, 0, 0.05)",
  raised: "0 4px 12px rgba(0, 0, 0, 0.10)",
  overlay: "0 8px 24px rgba(0, 0, 0, 0.18)",
} as const;

export type Shadows = typeof shadows;
export type ShadowKey = keyof typeof shadows;
