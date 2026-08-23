import { Platform } from "react-native";
import { Color } from "expo-router";

export const getColors = (isDark: boolean) => ({
  systemBackground: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.surface,
    default: isDark ? "#000000" : "#FFFFFF",
  })!,
  secondarySystemBackground: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surfaceVariant,
    default: isDark ? "#1C1C1E" : "#F2F2F7",
  })!,
  label: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onSurface,
    default: isDark ? "#FFFFFF" : "#000000",
  })!,
  secondaryLabel: Platform.select({
    ios: Color.ios.secondaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: isDark ? "#8E8E93" : "#6C6C70",
  })!,
  systemBlue: Platform.select({
    ios: Color.ios.systemBlue,
    android: Color.android.dynamic.primary,
    default: "#007AFF",
  })!,
});
