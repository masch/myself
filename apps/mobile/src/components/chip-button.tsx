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
import { colors, spacing, radius } from "@/theme";
import { AppIcon } from "./app-icon";
import { ThemedText } from "./themed-text";

export type ChipVariant =
  "default" | "success" | "purple" | "blue" | "secondary" | "destructive";

export interface ChipButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  icon?: string;
  variant?: ChipVariant;
  backgroundColor?: ColorValue;
  textColor?: ColorValue;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function ChipButton({
  title,
  icon,
  variant = "default",
  backgroundColor,
  textColor,
  style,
  textStyle,
  disabled,
  ...props
}: ChipButtonProps) {
  const getColors = (): {
    bg: ColorValue;
    text: ColorValue;
    iconColor: ColorValue;
  } => {
    switch (variant) {
      case "success":
        return {
          bg: "rgba(52, 199, 89, 0.15)",
          text: colors.systemGreen,
          iconColor: colors.systemGreen,
        };
      case "purple":
        return {
          bg: colors.systemPurpleSubdued,
          text: colors.systemPurple,
          iconColor: colors.systemPurple,
        };
      case "blue":
        return {
          bg: colors.systemBlueSubdued,
          text: colors.systemBlue,
          iconColor: colors.systemBlue,
        };
      case "secondary":
        return {
          bg: colors.systemGray15,
          text: colors.secondaryLabel,
          iconColor: colors.secondaryLabel,
        };
      case "destructive":
        return {
          bg: colors.destructiveSubdued,
          text: colors.systemRed,
          iconColor: colors.systemRed,
        };
      case "default":
      default:
        return {
          bg: colors.secondarySystemBackground,
          text: colors.label,
          iconColor: colors.label,
        };
    }
  };

  const palette = getColors();
  const finalBg = backgroundColor || palette.bg;
  const finalText = textColor || palette.text;

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: finalBg as any,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        style,
      ]}
      disabled={disabled}
      {...props}
    >
      {icon && <AppIcon name={icon} size={14} color={palette.iconColor} />}
      <ThemedText
        variant="caption1"
        color={finalText}
        style={[styles.text, textStyle]}
      >
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md - 4, // 12px
    paddingVertical: spacing.xs + 2, // 6px
    borderRadius: radius.lg - 2, // 14px
    borderCurve: "continuous",
    gap: spacing.xs + 2, // 6px
  },
  text: {
    fontWeight: "600",
  },
});
