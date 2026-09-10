import React from "react";
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type PressableProps,
  type ColorValue,
} from "react-native";
import { colors } from "@/theme/colors";
import { AppIcon } from "./app-icon";

export type IconButtonSize = "small" | "medium" | "large";

export interface IconButtonProps extends Omit<PressableProps, "style"> {
  icon: string;
  color?: ColorValue;
  size?: IconButtonSize;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
}

export function IconButton({
  icon,
  color = colors.systemBlue,
  size = "medium",
  style,
  hitSlop = 8,
  disabled,
  ...props
}: IconButtonProps) {
  const iconPixelSize = size === "small" ? 16 : size === "large" ? 24 : 18;

  return (
    <Pressable
      role="button"
      aria-label={props.accessibilityLabel}
      hitSlop={hitSlop}
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
