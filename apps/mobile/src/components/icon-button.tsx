import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type PressableProps,
  type ColorValue,
} from "react-native";
import { colors } from "@/theme";
import { AppIcon } from "./app-icon";

export type IconButtonSize = "small" | "medium" | "large";

export interface IconButtonProps extends Omit<
  PressableProps,
  "style" | "accessibilityLabel"
> {
  icon: string;
  accessibilityLabel: string;
  color?: ColorValue;
  size?: IconButtonSize;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
}

export function IconButton({
  icon,
  accessibilityLabel,
  color = colors.systemBlue,
  size = "medium",
  style,
  hitSlop = 8,
  disabled,
  ...props
}: IconButtonProps) {
  const iconPixelSize = size === "small" ? 16 : size === "large" ? 24 : 18;

  // `hitSlop` is a native affordance only. On the web, react-native-web's
  // Pressable rejects the press against the hit rect it derives from it, so every
  // icon button becomes a dead target there: the ✕ of the gondola search, the
  // settings rows and the reading cards all ignored their taps. Passing it only
  // where it is honoured is what keeps the component pressable on both platforms.
  const effectiveHitSlop = Platform.OS === "web" ? undefined : hitSlop;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      aria-label={accessibilityLabel}
      hitSlop={effectiveHitSlop}
      style={({ pressed }) => [
        styles.base,

        {
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
        style,
      ]}
      disabled={disabled}
      {...props}
    >
      <AppIcon name={icon} size={iconPixelSize} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
