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
  View,
} from "react-native";
import { colors } from "@/theme/colors";
import { AppIcon } from "./app-icon";

export type ButtonVariant =
  "primary" | "secondary" | "purple" | "green" | "destructive" | "gray";

export interface ButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  subtitle?: string;
  icon?: string;
  variant?: ButtonVariant;
  backgroundColor?: ColorValue;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
}

export function AppButton({
  title,
  subtitle,
  icon,
  variant = "primary",
  backgroundColor,
  style,
  titleStyle,
  subtitleStyle,
  disabled,
  ...props
}: ButtonProps) {
  const getVariantStyles = (): {
    containerBg: ColorValue;
    textColor: ColorValue;
    subtextColor: ColorValue;
    iconColor: ColorValue;
  } => {
    switch (variant) {
      case "purple":
        return {
          containerBg: colors.systemPurple,
          textColor: colors.white,
          subtextColor: colors.whiteSubdued,
          iconColor: colors.white,
        };
      case "green":
        return {
          containerBg: colors.systemGreen,
          textColor: colors.white,
          subtextColor: colors.whiteSubdued,
          iconColor: colors.white,
        };
      case "destructive":
        return {
          containerBg: colors.systemRed,
          textColor: colors.white,
          subtextColor: colors.whiteSubdued,
          iconColor: colors.white,
        };
      case "secondary":
        return {
          containerBg: colors.secondarySystemBackground,
          textColor: colors.label,
          subtextColor: colors.secondaryLabel,
          iconColor: colors.label,
        };
      case "gray":
        return {
          containerBg: colors.systemGray15,
          textColor: colors.label,
          subtextColor: colors.secondaryLabel,
          iconColor: colors.secondaryLabel,
        };
      case "primary":
      default:
        return {
          containerBg: colors.systemBlue,
          textColor: colors.white,
          subtextColor: colors.whiteSubdued,
          iconColor: colors.white,
        };
    }
  };

  const { containerBg, textColor, subtextColor, iconColor } =
    getVariantStyles();

  const finalBg = backgroundColor || containerBg;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.baseButton,
        {
          backgroundColor: finalBg as any,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
      disabled={disabled}
      {...props}
    >
      <View style={styles.contentRow}>
        {icon && <AppIcon name={icon} size={20} color={iconColor as any} />}
        <Text
          style={[styles.titleText, { color: textColor as any }, titleStyle]}
        >
          {title}
        </Text>
      </View>

      {subtitle ? (
        <Text
          style={[
            styles.subtitleText,
            { color: subtextColor as any },
            subtitleStyle,
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  icon: {
    width: 20,
    height: 20,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
