import React from "react";
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type PressableProps,
  type ColorValue,
  View,
} from "react-native";
import { colors, layout, spacing, radius } from "@/theme";
import { AppIcon } from "./app-icon";
import { ThemedText } from "./themed-text";

export type ButtonVariant =
  "primary" | "secondary" | "purple" | "green" | "destructive" | "gray";

/**
 * `regular` is the full-height action. `compact` trades a little touch area for
 * vertical density, for entry points that sit inside a scrolled header where the
 * list, not the button, is the subject.
 */
export type ButtonSize = "regular" | "compact";

export interface ButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  subtitle?: string;
  icon?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
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
  size = "regular",
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

  const finalAccessibilityLabel =
    props.accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={finalAccessibilityLabel}
      aria-label={finalAccessibilityLabel}
      style={({ pressed }) => [
        styles.baseButton,
        size === "compact" && styles.compactButton,
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
        {icon && (
          <AppIcon
            name={icon}
            size={size === "compact" ? 16 : 20}
            color={iconColor as any}
          />
        )}
        <ThemedText
          variant="headline"
          color={textColor}
          style={[styles.titleText, titleStyle]}
        >
          {title}
        </ThemedText>
      </View>

      {subtitle ? (
        <ThemedText
          variant="caption1"
          color={subtextColor}
          style={[styles.subtitleText, subtitleStyle]}
        >
          {subtitle}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md - 2, // 14px
    paddingHorizontal: spacing.lg - 4, // 20px
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
    minHeight: layout.minInteractiveTarget,
  },
  compactButton: {
    minHeight: layout.compactControlHeight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  titleText: {
    textAlign: "center",
  },
  subtitleText: {
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
