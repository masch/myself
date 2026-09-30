import React from "react";
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type PressableProps,
  type ColorValue,
} from "react-native";
import { colors, spacing } from "@/theme";
import { ThemedText } from "./themed-text";

export type HeaderButtonVariant = "primary" | "cancel" | "destructive";

export interface HeaderButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: HeaderButtonVariant;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function HeaderButton({
  title,
  variant = "primary",
  color,
  style,
  textStyle,
  disabled,
  ...props
}: HeaderButtonProps) {
  const getDefaultColor = (): ColorValue => {
    switch (variant) {
      case "cancel":
      case "destructive":
        return colors.systemRed;
      case "primary":
      default:
        return colors.systemBlue;
    }
  };

  const finalColor = color || getDefaultColor();
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
        style,
      ]}
      disabled={disabled}
      {...props}
    >
      <ThemedText
        variant="callout"
        color={finalColor}
        style={[
          styles.text,
          {
            fontWeight: isPrimary ? "600" : "400",
          },
          textStyle,
        ]}
      >
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    textAlign: "center",
  },
});
