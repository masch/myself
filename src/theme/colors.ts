import { Platform } from "react-native";
import { Color } from "expo-router";

/**
 * Universal semantic colors.
 * - iOS: UIKit semantic colors
 * - Android: Material 3 dynamic colors
 * - Web: CSS variables that resolve instantaneously via CSS media queries (0ms flash)
 */
export const colors = {
  systemBackground: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.surface,
    default: "var(--system-background, #000000)",
  })!,
  secondarySystemBackground: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surfaceVariant,
    default: "var(--secondary-system-background, #1C1C1E)",
  })!,
  label: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onSurface,
    default: "var(--label, #FFFFFF)",
  })!,
  secondaryLabel: Platform.select({
    ios: Color.ios.secondaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: "var(--secondary-label, #8E8E93)",
  })!,
  systemBlue: Platform.select({
    ios: Color.ios.systemBlue,
    android: Color.android.dynamic.primary,
    default: "#007AFF",
  })!,
};
