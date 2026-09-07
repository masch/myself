import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type PressableProps,
  type ColorValue,
} from "react-native";
import { colors } from "@/theme/colors";
import { AppIcon } from "./app-icon";

export type ChipVariant =
  "default" | "success" | "purple" | "blue" | "secondary";

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
          bg: "rgba(175, 82, 222, 0.15)",
          text: colors.systemPurple,
          iconColor: colors.systemPurple,
        };
      case "blue":
        return {
          bg: "rgba(0, 122, 255, 0.15)",
          text: colors.systemBlue,
          iconColor: colors.systemBlue,
        };
      case "secondary":
        return {
          bg: "rgba(142, 142, 147, 0.15)",
          text: colors.secondaryLabel,
          iconColor: colors.secondaryLabel,
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
      <Text style={[styles.text, { color: finalText as any }, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  icon: {
    width: 15,
    height: 15,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
});
